/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers, KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { lastValueFrom, reduce } from 'rxjs';
import { inject, injectable } from 'inversify';
import { CoreStart, Request } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { createHmac, timingSafeEqual } from 'crypto';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import { BaseAlertingRoute } from './base_alerting_route';
import { AlertingRouteContext } from './alerting_route_context';
import {
  EncryptedSavedObjectsClientToken,
  KibanaBaseUrlToken,
} from '../lib/dispatcher/steps/dispatch_step_tokens';
import {
  AgentBuilderExecutionToken,
  SlackEventsConfigToken,
  type AgentExecutionContract,
  type SlackEventsConfig,
} from '../lib/slack_events/tokens';
import { AGENTIC_ANALYSIS_SETTINGS_TYPE } from '../saved_objects';
import { AGENTIC_ANALYSIS_SETTINGS_ID } from './settings/agentic_analysis_constants';

const SLACK_THREADS_INDEX = 'alerting-v2-slack-threads';
const OBSERVABILITY_AGENT_ID = 'observability.agent';
const SLACK_API_BASE = 'https://slack.com/api';
const TRIGGER_REACTION = 'mag';

const slackEventSchema = z
  .object({
    type: z.string(),
    challenge: z.string().optional(),
    token: z.string().optional(),
    event: z
      .object({
        type: z.string(),
        user: z.string().optional(),
        reaction: z.string().optional(),
        item: z
          .object({
            type: z.string(),
            channel: z.string(),
            ts: z.string(),
          })
          .passthrough()
          .optional(),
        event_ts: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

type SlackEventPayload = z.infer<typeof slackEventSchema>;

interface EpisodeThreadDoc {
  episode_id: string;
  thread_ts: string;
  channel: string;
  rule_name: string;
  rule_url: string;
  group_values: string;
  episode_url: string;
  started_at: string;
}

@injectable()
export class SlackEventsRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = '/api/alerting/v2/slack/events';

  static security: RouteSecurity = {
    authc: {
      enabled: false,
      reason:
        'This endpoint receives webhooks from the Slack Events API which cannot authenticate with Kibana.',
    },
    authz: {
      enabled: false,
      reason:
        'Authorization is handled via Slack signing secret verification instead of Kibana privileges.',
    },
  };

  static options = {
    access: 'public' as const,
    tags: ['oas-tag:alerting-v2'],
    availability: { stability: 'experimental' as const },
    xsrfRequired: false,
    body: {
      maxBytes: 1048576,
    },
  };

  static validate = {
    request: {
      body: buildRouteValidationWithZod(slackEventSchema),
    },
  };

  protected readonly routeName = 'slack events webhook';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, SlackEventPayload>,
    @inject(KibanaBaseUrlToken)
    private readonly kibanaBaseUrl: string | undefined,
    @inject(SlackEventsConfigToken)
    private readonly slackConfig: SlackEventsConfig,
    @inject(EncryptedSavedObjectsClientToken)
    private readonly esoClient: EncryptedSavedObjectsClient,
    @inject(CoreStart('elasticsearch'))
    private readonly elasticsearch: ElasticsearchServiceStart,
    @inject(AgentBuilderExecutionToken)
    private readonly agentExecution: AgentExecutionContract | undefined
  ) {
    super(ctx);
  }

  protected async execute() {
    if (!this.slackConfig.enabled) {
      return this.ctx.response.notFound();
    }

    if (!this.verifySlackSignature()) {
      this.ctx.logger.warn('Slack signature verification failed');
      return this.ctx.response.unauthorized({ body: { message: 'Invalid signature' } });
    }

    const { type } = this.request.body;

    if (type === 'url_verification') {
      return this.ctx.response.ok({
        body: { challenge: this.request.body.challenge },
      });
    }

    if (type === 'event_callback') {
      const { event } = this.request.body;

      if (
        event?.type === 'reaction_added' &&
        event.reaction === TRIGGER_REACTION &&
        event.item?.type === 'message'
      ) {
        this.handleReaction(event.item.channel, event.item.ts).catch((err) => {
          this.ctx.logger.error(`Failed to process mag reaction: ${err.message}`);
        });
      }
    }

    return this.ctx.response.ok({ body: { ok: true } });
  }

  private verifySlackSignature(): boolean {
    const { slackSigningSecret } = this.slackConfig;
    if (!slackSigningSecret) {
      return true;
    }

    const timestamp = this.request.headers['x-slack-request-timestamp'] as string | undefined;
    const signature = this.request.headers['x-slack-signature'] as string | undefined;

    if (!timestamp || !signature) {
      return false;
    }

    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    if (parseInt(timestamp, 10) < fiveMinutesAgo) {
      return false;
    }

    const rawBody = JSON.stringify(this.request.body);
    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const hmac = createHmac('sha256', slackSigningSecret);
    hmac.update(sigBasestring);
    const computed = `v0=${hmac.digest('hex')}`;

    try {
      return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  private async handleReaction(channel: string, messageTs: string): Promise<void> {
    const logger = this.ctx.logger;
    logger.info(`[slack-events] Processing :mag: reaction on channel=${channel} ts=${messageTs}`);

    const apiKey = await this.getStoredApiKey();
    if (!apiKey) {
      logger.warn('[slack-events] Agentic analysis is not enabled — no stored API key');
      await this.postSlackMessage(
        channel,
        messageTs,
        ':warning: Agentic analysis is not enabled. An admin must enable it in ' +
          'Kibana under *Management > V2 Alerting Preview > Settings*.'
      );
      return;
    }

    const fakeRequest = this.craftFakeRequest(apiKey);
    const esClient = this.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

    const episodeDoc = await this.lookupEpisode(esClient, channel, messageTs);
    if (!episodeDoc) {
      logger.warn(`No episode thread found for channel=${channel} ts=${messageTs}`);
      await this.postSlackMessage(
        channel,
        messageTs,
        ':warning: Could not find an alert episode linked to this message.'
      );
      return;
    }

    const groupValues = this.parseGroupValues(episodeDoc.group_values);
    const groupLabel = groupValues
      ? Object.entries(groupValues)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : 'unknown';

    await this.postSlackMessage(
      channel,
      episodeDoc.thread_ts,
      `:hourglass_flowing_sand: *Starting investigation...*\n` +
        `Rule: *${episodeDoc.rule_name}*  |  ${groupLabel}\n` +
        `_The Observability Agent is analyzing this alert. This may take a minute._\n` +
        `_Once complete, you'll receive the analysis and a link to continue the conversation._`
    );

    logger.info(
      `[slack-events] Starting Agent Builder conversation for ` +
        `episode="${episodeDoc.episode_id}" rule="${episodeDoc.rule_name}"`
    );

    const onConversationCreated = async (conversationId: string) => {
      const conversationUrl = this.kibanaBaseUrl
        ? `${this.kibanaBaseUrl}/app/agent_builder/conversations/${conversationId}`
        : null;

      if (conversationUrl) {
        await this.postSlackMessage(
          channel,
          episodeDoc.thread_ts,
          `:speech_balloon: <${conversationUrl}|Follow along in Kibana>`
        );
      }
    };

    const agentResponse = await this.converseWithAgent(
      fakeRequest,
      episodeDoc,
      groupLabel,
      onConversationCreated
    );

    const conversationUrl =
      this.kibanaBaseUrl && agentResponse.conversationId
        ? `${this.kibanaBaseUrl}/app/agent_builder/conversations/${agentResponse.conversationId}`
        : null;

    const replyParts = [
      `:mag_right: *Investigation Results*`,
      '',
      agentResponse.message,
      '',
      conversationUrl
        ? `:speech_balloon: <${conversationUrl}|Continue this conversation in Kibana>`
        : '',
      episodeDoc.episode_url ? `:link: <${episodeDoc.episode_url}|View episode>` : '',
    ];

    await this.postSlackMessage(
      channel,
      episodeDoc.thread_ts,
      replyParts.filter(Boolean).join('\n')
    );

    logger.info(
      `[slack-events] Posted investigation results for episode=${episodeDoc.episode_id}` +
        (agentResponse.conversationId
          ? ` conversation=${agentResponse.conversationId}`
          : '')
    );
  }

  private async getStoredApiKey(): Promise<string | null> {
    try {
      const so = await this.esoClient.getDecryptedAsInternalUser(
        AGENTIC_ANALYSIS_SETTINGS_TYPE,
        AGENTIC_ANALYSIS_SETTINGS_ID
      );

      const attrs = so.attributes as { enabled: boolean; auth?: { apiKey?: string } };
      if (attrs.enabled && attrs.auth?.apiKey) {
        return attrs.auth.apiKey;
      }
      return null;
    } catch {
      return null;
    }
  }

  private craftFakeRequest(apiKey: string): KibanaRequest {
    const requestHeaders: Headers = {
      authorization: `ApiKey ${apiKey}`,
    };

    const fakeRawRequest: FakeRawRequest = {
      headers: requestHeaders,
      path: '/',
    };

    return kibanaRequestFactory(fakeRawRequest);
  }

  private async lookupEpisode(
    esClient: ElasticsearchClient,
    channel: string,
    messageTs: string
  ): Promise<EpisodeThreadDoc | null> {
    const logger = this.ctx.logger;
    const query = {
      bool: {
        filter: [{ term: { channel } }, { term: { thread_ts: messageTs } }],
      },
    };

    logger.info(
      `[slack-events] Looking up episode in index="${SLACK_THREADS_INDEX}" ` +
        `channel="${channel}" thread_ts="${messageTs}"`
    );

    try {
      const result = await esClient.search<EpisodeThreadDoc>({
        index: SLACK_THREADS_INDEX,
        query,
        size: 1,
      });

      const totalHits =
        typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total?.value ?? 0;

      logger.info(`[slack-events] Episode lookup returned ${totalHits} hits`);

      const hit = result.hits.hits[0];
      if (hit?._source) {
        logger.info(
          `[slack-events] Matched episode: episode_id="${hit._source.episode_id}" ` +
            `rule_name="${hit._source.rule_name}"`
        );
      }
      return hit?._source ?? null;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[slack-events] Episode lookup failed: ${errMessage}`);
      return null;
    }
  }

  private parseGroupValues(raw: string): Record<string, string> | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async converseWithAgent(
    fakeRequest: KibanaRequest,
    episode: EpisodeThreadDoc,
    groupLabel: string,
    onConversationCreated?: (conversationId: string) => Promise<void>
  ): Promise<{ message: string; conversationId: string | null }> {
    if (!this.agentExecution) {
      return {
        message: '_Investigation failed: Agent Builder plugin is not available._',
        conversationId: null,
      };
    }

    const prompt = [
      `An SRE is investigating an alert and needs your help.`,
      ``,
      `**Alert:** ${episode.rule_name}`,
      `**Affected:** ${groupLabel}`,
      `**Started:** ${episode.started_at}`,
      episode.rule_url ? `**Rule:** ${episode.rule_url}` : '',
      episode.episode_url ? `**Episode:** ${episode.episode_url}` : '',
      ``,
      `Please investigate this alert by:`,
      `1. Analyzing recent traces for the affected service to identify errors or latency spikes`,
      `2. Checking logs for error patterns or anomalies`,
      `3. Reviewing relevant metrics for resource utilization issues`,
      `4. Identifying any correlated changes or deployments that may explain the alert`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const { events$ } = await this.agentExecution.executeAgent({
        request: fakeRequest,
        useTaskManager: false,
        params: {
          agentId: OBSERVABILITY_AGENT_ID,
          nextInput: { message: prompt },
        },
      });

      let conversationCallbackFired = false;

      const result = await lastValueFrom(
        events$.pipe(
          reduce(
            (acc, event) => {
              if (event.type === 'message_complete') {
                acc.message = String(event.data.message_content ?? '');
              }
              if (
                event.type === 'conversation_created' ||
                event.type === 'conversation_id_set'
              ) {
                acc.conversationId = String(event.data.conversation_id ?? '');
              }
              if (event.type === 'conversation_created' && acc.conversationId) {
                if (!conversationCallbackFired && onConversationCreated) {
                  conversationCallbackFired = true;
                  onConversationCreated(acc.conversationId).catch((err) => {
                    this.ctx.logger.error(
                      `[slack-events] Failed to post initial message: ${err.message}`
                    );
                  });
                }
              }
              return acc;
            },
            { message: '', conversationId: null as string | null }
          )
        )
      );

      return {
        message: result.message || 'No response from agent.',
        conversationId: result.conversationId,
      };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      this.ctx.logger.error(`[slack-events] Agent Builder execution failed: ${errMessage}`);
      return {
        message: `_Investigation failed: ${errMessage}_`,
        conversationId: null,
      };
    }
  }

  private async postSlackMessage(
    channel: string,
    threadTs: string,
    text: string
  ): Promise<void> {
    const { slackBotToken } = this.slackConfig;
    if (!slackBotToken) {
      this.ctx.logger.error('Cannot post to Slack: slackBotToken is not configured');
      return;
    }

    try {
      const resp = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${slackBotToken}`,
        },
        body: JSON.stringify({
          channel,
          thread_ts: threadTs,
          text,
          unfurl_links: false,
          unfurl_media: false,
        }),
      });

      const data = (await resp.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        this.ctx.logger.error(`Slack chat.postMessage failed: ${data.error}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.ctx.logger.error(`Slack API call failed: ${message}`);
    }
  }
}
