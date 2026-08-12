/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  verifyKiStepCommonDefinition,
  type VerifyKiStepOutput,
} from '../../common/step_types/verify_ki';
import { KiVerifierRegistry, KiVerificationService } from '../ki_verification';
import type { KiVerifier, KnowledgeIndicator } from '../ki_verification';
import type { ContextEnginePluginStart, ContextEngineStartDependencies } from '../types';

export interface VerifyKiStepDeps {
  coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>;
  registry: KiVerifierRegistry;
  logger: Logger;
}

const DEFAULT_SIZE = 10;

const selectVerifiers = (registry: KiVerifierRegistry, ids?: string[]): KiVerifier[] => {
  const all = registry.getAll();
  if (!ids?.length) {
    return all;
  }
  const byId = new Map(all.map((verifier) => [verifier.id, verifier]));
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length > 0) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: `Unknown KI verifier(s): ${unknown.join(', ')}`,
      details: { registered: all.map((verifier) => verifier.id) },
    });
  }
  return ids.flatMap((id) => byId.get(id) ?? []);
};

export const getVerifyKiStepDefinition = ({ coreSetup, registry, logger }: VerifyKiStepDeps) =>
  createServerStepDefinition({
    ...verifyKiStepCommonDefinition,
    handler: async (context) => {
      const { index, size = DEFAULT_SIZE } = context.input;

      const [coreStart] = await coreSetup.getStartServices();
      const fakeRequest = context.contextManager.getFakeRequest();
      const uiSettings = coreStart.uiSettings.asScopedToClient(
        coreStart.savedObjects.getScopedClient(fakeRequest)
      );
      const isEnabled = (await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)) ?? false;
      if (!isEnabled) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `Context Engine is disabled; enable the ${CONTEXT_ENGINE_ENABLED_SETTING_ID} advanced setting to run KI verification`,
        });
      }

      const runRegistry = new KiVerifierRegistry();
      selectVerifiers(registry, context.config?.verifiers).forEach((verifier) =>
        runRegistry.register(verifier)
      );
      const service = new KiVerificationService(runRegistry);

      const esClient = context.contextManager.getScopedEsClient();
      const response = await esClient.search<KnowledgeIndicator>(
        { index, size },
        { signal: context.abortSignal }
      );

      const results: VerifyKiStepOutput['results'] = [];
      for (const hit of response.hits.hits) {
        const ki = hit._source ?? {};
        const summary = await service.verifyKi(ki, {
          isEnabled: true,
          esClient,
          logger,
          abortSignal: context.abortSignal,
        });
        results.push({
          id: hit._id ?? '',
          title: ki.title,
          passed: summary.passed,
          verifierResults: summary.results.map((result) =>
            result.passed
              ? { verifier: result.verifier, passed: true }
              : { verifier: result.verifier, passed: false, reason: result.reason }
          ),
        });
      }

      const passed = results.filter((result) => result.passed).length;
      return {
        output: { total: results.length, passed, failed: results.length - passed, results },
      };
    },
  });
