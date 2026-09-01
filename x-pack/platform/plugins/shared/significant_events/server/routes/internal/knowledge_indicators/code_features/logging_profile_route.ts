/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '@kbn/streams-plugin/common/constants';
import { getCodeboxClient } from '../../../../lib/knowledge_indicators/code_intelligence/codebox_client';
import {
  detectLoggingProfileDrift,
  readLoggingProfile,
  writeLoggingProfile,
  type LoggingProfileGrep,
} from '../../../../lib/knowledge_indicators/code_intelligence';
import {
  validateLoggingQueriesHandler,
  type GrepCandidateInput,
} from '../../../../agent_builder/tools/validate_logging_queries/handler';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { StatusError } from '../../../../lib/errors/status_error';

const codeIntelligenceInput = z.string().min(1).max(256);
// `gitRefKey` uses the empty string as its snapshot-mode sentinel (incremental
// scope only), so it must accept `''` and cannot carry the `.min(1)` bound the
// other identifiers use.
const gitRefKeyInput = z.string().max(256);

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
      gitRefKey: gitRefKeyInput.optional(),
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
    const { licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const routeLogger = logger.get('code_intelligence', 'logging_profile');
    const spaceId = await getSpaceId(request);
    const codebox = await getCodeboxClient({
      actions: server.actions,
      request,
      logger: routeLogger,
    });

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
      codebox,
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
 * Persists the `logging_profile` produced by the workflow's `ai.agent` step.
 *
 * The agent's structured output is NOT trusted verbatim: this route re-runs every
 * grep through {@link validateLoggingQueriesHandler} server-side, re-deriving the
 * hit count and the over-capture ratio against the indexed commit. Only greps that
 * PASS validation (`covers_evidence AND hit_ratio < ceiling`) are persisted, with
 * the SERVER-DERIVED `hits` as `expect_call_sites` — never the agent's self-reported
 * number. A grep that fails validation (zero hits, evidence missed, over-capture,
 * invalid syntax, or a query failure) is rejected with a 400 so the workflow
 * surfaces it (Failure Transparency) rather than silently dropping it. This
 * closes INV-001 (non-zero, server-derived) and INV-006 (over-capture ceiling) at
 * the only production persist path — the untrusted boundary the ceiling exists to
 * police — instead of only in unit tests that call `writeLoggingProfile` directly.
 */
const persistLoggingProfileRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_persist_logging_profile',
  options: {
    access: 'internal',
    summary:
      'Persist a logging_profile (server-validated repo-specific idiom greps) for a repository + commit',
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
      gitRefKey: gitRefKeyInput.optional(),
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
    const codebox = await getCodeboxClient({
      actions: server.actions,
      request,
      logger: routeLogger,
    });

    // Re-validate every grep server-side against the indexed commit. The agent's
    // self-reported `expect_call_sites` is discarded; the server-derived `hits`
    // and the validate tool's `pass` verdict are what get persisted.
    const candidates: GrepCandidateInput[] = params.body.greps.map((g) => ({
      regex: g.regex,
      evidence: { path: g.evidence.path, line: g.evidence.line },
    }));

    const validation = await validateLoggingQueriesHandler({
      codebox,
      repository: params.body.repository,
      gitCommit: params.body.gitSha,
      greps: candidates,
      logger: routeLogger,
    });

    const greps: LoggingProfileGrep[] = [];
    const failed: string[] = [];
    for (let i = 0; i < validation.results.length; i++) {
      const result = validation.results[i];
      const candidate = params.body.greps[i];
      if (result.pass) {
        greps.push({
          regex: result.grep,
          expect_call_sites: result.hits,
          evidence: { path: candidate.evidence.path, line: candidate.evidence.line },
        });
      } else {
        failed.push(
          `${result.grep} (status=${result.status}${
            result.error ? `, error=${result.error}` : ''
          }, hits=${result.hits})`
        );
      }
    }

    if (failed.length > 0) {
      throw new StatusError(
        `logging_profile: refusing to persist — ${
          failed.length
        } grep(s) failed server-side validation (INV-001/INV-006): ${failed.join('; ')}`,
        400
      );
    }

    await writeLoggingProfile({
      kiClient,
      spaceId,
      repository: params.body.repository,
      commit: params.body.gitSha,
      greps,
      repoTotalLines: validation.repo_total_lines,
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
