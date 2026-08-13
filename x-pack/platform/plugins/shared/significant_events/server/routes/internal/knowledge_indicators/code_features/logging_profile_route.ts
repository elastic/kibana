/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '@kbn/streams-plugin/common/constants';
import {
  detectLoggingProfileDrift,
  readLoggingProfile,
  writeLoggingProfile,
  type LoggingProfileGrep,
} from '../../../../lib/knowledge_indicators/code_intelligence';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';

const codeIntelligenceInput = z.string().min(1).max(256);

/**
 * Checks whether a valid `logging_profile` exists for a repository + commit and
 * whether drift was detected. The code-extraction workflow gates its `ai.agent`
 * step on this output (INV-003): the agent runs only when `needs_refresh` is true
 * (no valid profile, or a stored grep's recount dropped to zero / fell by more
 * than the configured ratio). A failed count query never sets `needs_refresh`
 * (INV-002) — the profile is kept and the failure is reported separately.
 */
const checkLoggingProfileRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_check_logging_profile',
  options: {
    access: 'internal',
    summary:
      'Check whether a logging_profile exists for a repository + commit and whether drift requests a refresh',
    timeout: { idleSocket: 120_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      repository: codeIntelligenceInput,
      gitSha: codeIntelligenceInput,
      runId: codeIntelligenceInput.optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
    maintenanceService,
  }): Promise<{
    has_profile: boolean;
    needs_refresh: boolean;
    reason: 'no_profile' | 'drift' | 'none' | 'query_failed';
    drift?: {
      refresh: boolean;
      greps: Array<{
        regex: string;
        expected: number;
        actual: number;
        failed: boolean;
        refresh: boolean;
        reason: 'zero' | 'ratio_drop' | null;
      }>;
    };
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const routeLogger = logger.get('code_intelligence', 'logging_profile');
    const spaceId = await getSpaceId(request);
    const esClient = scopedClusterClient.asCurrentUser;

    const profile = await readLoggingProfile({
      kiClient: await scopedClients.getKnowledgeIndicatorClient(),
      spaceId,
      repository: params.body.repository,
      commit: params.body.gitSha,
    });

    if (!profile) {
      return { has_profile: false, needs_refresh: true, reason: 'no_profile' };
    }

    const drift = await detectLoggingProfileDrift({
      esClient,
      repository: params.body.repository,
      gitCommit: params.body.gitSha,
      profile,
      logger: routeLogger,
    });

    const queryFailed = drift.greps.some((g) => g.failed);
    return {
      has_profile: true,
      needs_refresh: drift.refresh,
      reason: drift.refresh ? 'drift' : queryFailed ? 'query_failed' : 'none',
      drift: {
        refresh: drift.refresh,
        greps: drift.greps.map((g) => ({
          regex: g.regex,
          expected: g.expected,
          actual: g.actual,
          failed: g.failed,
          refresh: g.refresh,
          reason: g.reason,
        })),
      },
    };
  },
});

/**
 * Persists the `logging_profile` produced by the workflow's `ai.agent` step. The
 * agent's structured output is the grep list; this route validates each grep
 * against INV-001 / INV-006 (via {@link writeLoggingProfile}) before writing. A
 * rejection surfaces as an error so the workflow does not silently drop greps.
 */
const persistLoggingProfileRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_persist_logging_profile',
  options: {
    access: 'internal',
    summary:
      'Persist a logging_profile (validated repo-specific idiom greps) for a repository + commit',
    timeout: { idleSocket: 120_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      repository: codeIntelligenceInput,
      gitSha: codeIntelligenceInput,
      runId: codeIntelligenceInput.optional(),
      greps: z
        .array(
          z.object({
            regex: codeIntelligenceInput,
            expect_call_sites: z.number().int().min(0),
            evidence: z.object({
              path: codeIntelligenceInput,
              line: z.number().int().min(1),
            }),
          })
        )
        .max(100),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
    maintenanceService,
  }): Promise<{ persisted: number; repository: string; commit: string }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const routeLogger = logger.get('code_intelligence', 'logging_profile');
    const spaceId = await getSpaceId(request);
    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    const greps: LoggingProfileGrep[] = params.body.greps.map((g) => ({
      regex: g.regex,
      expect_call_sites: g.expect_call_sites,
      evidence: { path: g.evidence.path, line: g.evidence.line },
    }));

    await writeLoggingProfile({
      kiClient,
      spaceId,
      repository: params.body.repository,
      commit: params.body.gitSha,
      greps,
      runId: params.body.runId ?? `workflow:${request.id}`,
      logger: routeLogger,
    });

    return {
      persisted: greps.length,
      repository: params.body.repository,
      commit: params.body.gitSha,
    };
  },
});

export const internalLoggingProfileRoutes = {
  ...checkLoggingProfileRoute,
  ...persistLoggingProfileRoute,
};
