/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Tier A demo: post an archetype `ViewSpec` to Slack as native Block Kit, the
 * same payload Agent Builder renders to React. This POSTs `renderSlack().blocks`
 * straight to Slack's `chat.postMessage` (which accepts `blocks`), bypassing the
 * agent/connector path. Charts are not rasterized here — use the in-product
 * `post_view_to_slack` tool for PNG upload. Run with:
 *
 *   SLACK_BOT_TOKEN=xoxb-… SLACK_CHANNEL=C012AB3CD \
 *     node --require ./src/setup_node_env \
 *     x-pack/platform/plugins/shared/adaptive_ui/scripts/post_to_slack_demo.ts \
 *     --archetype nightshift.investigation
 *
 * Chart fixtures (`security.entity_analytics_dashboard`, `security.entity_risk_score_history`)
 * dry-run as the text fallback; PNG upload is the in-product `post_view_to_slack` tool.
 *
 * Pass `--dry-run` to render and print the blocks without a token or a POST.
 * Relative Kibana `href`s are rewritten against `--kibana-url` / `KIBANA_URL`
 * (default `http://localhost:5601`), matching `post_view_to_slack`.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { getViewSpecSchema, renderSlack, type ViewSpec } from '@kbn/adaptive-ui';
import {
  sampleCases,
  sampleEntityAnalyticsDashboard,
  sampleEntityRiskScoreHistory,
  sampleInvestigation,
  sampleSecurityRuleAttachment,
  sampleSigEvent,
  sampleTextAttachment,
  toCasesViewSpec,
  toEntityAnalyticsDashboardViewSpec,
  toEntityRiskScoreHistoryViewSpec,
  toInvestigationViewSpec,
  toSecurityRuleViewSpec,
  toSigEventViewSpec,
  toTextViewSpec,
} from '@kbn/adaptive-ui-adapters';
import { absolutizeViewSpecHrefs } from '../server/slack/absolutize_hrefs';

const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

const archetypes: Record<string, ViewSpec> = {
  text: toTextViewSpec(sampleTextAttachment),
  cases: toCasesViewSpec(sampleCases),
  'security.rule': toSecurityRuleViewSpec(sampleSecurityRuleAttachment),
  'streams.significantEvent': toSigEventViewSpec(sampleSigEvent),
  'nightshift.investigation': toInvestigationViewSpec(sampleInvestigation),
  'security.entity_analytics_dashboard': toEntityAnalyticsDashboardViewSpec(
    sampleEntityAnalyticsDashboard
  ),
  'security.entity_risk_score_history': toEntityRiskScoreHistoryViewSpec(
    sampleEntityRiskScoreHistory
  ),
};

const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const hasFlag = (name: string): boolean => argv.includes(`--${name}`);

const fail = (message: string): never => {
  log.error(message);
  process.exit(1);
};

const archetypeName = flag('archetype') ?? 'security.rule';
const spec = archetypes[archetypeName];
if (!spec) {
  fail(
    `Unknown archetype '${archetypeName}'. Choose one of: ${Object.keys(archetypes).join(', ')}.`
  );
}

// Same validation the renderer framework runs before mounting.
getViewSpecSchema().parse(spec);

const kibanaOrigin = (
  flag('kibana-url') ??
  process.env.KIBANA_URL ??
  'http://localhost:5601'
).replace(/\/+$/, '');
const slackSpec = absolutizeViewSpecHrefs(spec, kibanaOrigin);

// One ViewSpec, one Slack render: `text` is the notification fallback, `blocks`
// is the Block Kit that mirrors the React card.
const { text, blocks } = renderSlack(slackSpec);

const dryRun = hasFlag('dry-run');
const channel = flag('channel') ?? process.env.SLACK_CHANNEL;
const token = process.env.SLACK_BOT_TOKEN;

const run = async () => {
  log.info(`Archetype '${archetypeName}' -> Slack Block Kit (${blocks.length} blocks)\n`);

  if (dryRun) {
    log.info('== chat.postMessage body (dry run, not sent) ==');
    log.info(JSON.stringify({ channel: channel ?? '<channel>', text, blocks }, null, 2));
    return;
  }

  if (!token) {
    fail('Set SLACK_BOT_TOKEN (a xoxb-… bot token with chat:write) or pass --dry-run.');
  }
  if (!channel) {
    fail('Set SLACK_CHANNEL or pass --channel <id> (e.g. C012AB3CD), or pass --dry-run.');
  }

  const response = await fetch(SLACK_POST_MESSAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text, blocks }),
  });

  // Slack returns 200 with `{ ok: false, error }` for logical failures, so trust
  // the body over the HTTP status.
  const data = (await response.json()) as { ok?: boolean; error?: string; ts?: string };
  if (!data.ok) {
    fail(`Slack chat.postMessage error: ${data.error ?? 'unknown_error'}`);
  }

  log.success(`Posted '${archetypeName}' to ${channel} (ts ${data.ts}).`);
};

run().catch((error) => fail(error instanceof Error ? error.stack ?? error.message : String(error)));
