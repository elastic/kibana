/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, CustomRequestHandlerContext, IRouter, Logger } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { testAnonymizationPatterns } from '@kbn/ai-anonymization-server';
import type { RegexWorkerService } from '@kbn/ai-anonymization-server';
import { isValidLicense } from '../../common/license';

export type PatternTesterRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
}>;

export const PATTERN_TESTER_ROUTE_PATH = '/internal/ai_anonymization_settings/pattern_tester';

const testRegexRuleSchema = schema.object({
  type: schema.literal('RegExp'),
  enabled: schema.boolean(),
  pattern: schema.string({ maxLength: 5000 }),
  entityClass: schema.string({ maxLength: 100 }),
  id: schema.maybe(schema.string({ maxLength: 100 })),
  name: schema.maybe(schema.string({ maxLength: 200 })),
  builtIn: schema.maybe(schema.boolean()),
});

const patternTesterBodySchema = schema.object({
  input: schema.any(),
  rules: schema.arrayOf(testRegexRuleSchema, { maxSize: 200 }),
});

/**
 * Registers the management page's "Pattern tester": an ephemeral, non-persisting endpoint that
 * runs the caller-supplied regex rules against caller-supplied sample input, using the same
 * detection/masking code the real `chatComplete` pipeline uses.
 * NER rules are intentionally not supported here — the management UI never sends them.
 */
export function registerPatternTesterRoute({
  router,
  getStartServices,
  getRegexWorker,
  logger,
}: {
  router: IRouter<PatternTesterRequestHandlerContext>;
  getStartServices: CoreSetup['getStartServices'];
  /** A pool dedicated to this route, never the one serving `chatComplete` traffic. */
  getRegexWorker: () => RegexWorkerService | undefined;
  logger: Logger;
}) {
  router.post(
    {
      path: PATTERN_TESTER_ROUTE_PATH,
      security: {
        authz: {
          // Executes caller-supplied regular expressions, so it is limited to the privilege
          // needed to edit `ai:anonymizationSettings` itself (the same one core's uiSettings
          // routes require).
          requiredPrivileges: ['manage_advanced_settings'],
        },
      },
      validate: {
        body: patternTesterBodySchema,
      },
    },
    async (context, request, response) => {
      const { license } = await context.licensing;
      if (!isValidLicense(license)) {
        return response.forbidden({
          body: {
            message: 'Invalid license level. The pattern tester requires an Enterprise license.',
          },
        });
      }

      const regexWorker = getRegexWorker();
      if (!regexWorker) {
        return response.customError({
          statusCode: 503,
          body: { message: 'Anonymization service is not yet available' },
        });
      }

      // With workers disabled `run` executes synchronously on the Kibana thread, where the task
      // timeout cannot interrupt a pathological caller-supplied pattern.
      if (!regexWorker.isEnabled()) {
        return response.customError({
          statusCode: 503,
          body: {
            message:
              'The pattern tester is disabled: it needs anonymization worker threads (see xpack.aiAnonymizationSettings.patternTester.enabled and xpack.inference.workers.anonymization.enabled)',
          },
        });
      }

      const { input, rules } = request.body;
      const [coreStart] = await getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

      try {
        const result = await testAnonymizationPatterns({
          input,
          rules: rules as RegexAnonymizationRule[],
          regexWorker,
          esClient,
          logger,
        });

        return response.ok({ body: result });
      } catch (error) {
        return response.customError({
          statusCode: 400,
          body: {
            message: `Pattern test failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        });
      }
    }
  );
}
