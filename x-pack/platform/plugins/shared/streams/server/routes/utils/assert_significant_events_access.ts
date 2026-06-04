/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '../../../common';
import { FeatureNotEnabledError } from '../../lib/streams/errors/feature_not_enabled_error';
import { SecurityError } from '../../lib/streams/errors/security_error';
import type { StreamsServer } from '../../types';

interface SignificantEventsAccessContext {
  server: StreamsServer;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
}

type RequirementCheckResult = { met: true } | { met: false; reason: string };

interface SignificantEventsRequirement {
  /** Resolves whether the requirement is satisfied for the given context. */
  check: (context: SignificantEventsAccessContext) => Promise<RequirementCheckResult>;
  /** Builds the error thrown when the requirement is unmet. */
  toError: (reason: string) => Error;
}

/**
 * The single source of truth for everything that must be true for significant
 * events to work. Order matters: `assertSignificantEventsAccess` throws on the
 * first unmet requirement.
 */
const significantEventsRequirements: readonly SignificantEventsRequirement[] = [
  {
    check: async ({ server }) => {
      const met = server.core.pricing.isFeatureAvailable(
        STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
      );
      return met
        ? { met }
        : { met, reason: 'Significant events is not available on the current pricing tier.' };
    },
    toError: (reason) => new SecurityError(reason),
  },
  {
    check: async ({ licensing }) => {
      const license = await licensing.getLicense();
      const met = license.hasAtLeast('enterprise');
      return met
        ? { met }
        : { met, reason: 'An Enterprise license or higher is required to use significant events.' };
    },
    toError: (reason) => forbidden(reason),
  },
  {
    check: async ({ uiSettingsClient }) => {
      const enabled = await uiSettingsClient.get<boolean>(
        OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS
      );
      return enabled
        ? { met: true }
        : {
            met: false,
            reason: `Significant events is disabled. Enable "${OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS}" in Advanced Settings to start using it.`,
          };
    },
    toError: (reason) => new FeatureNotEnabledError(reason),
  },
  {
    check: async ({ server }) => {
      return server.workflowsExtensions
        ? { met: true }
        : {
            met: false,
            reason:
              'The Workflows feature is not available in this environment. Significant events relies on Workflows.',
          };
    },
    toError: (reason) => new FeatureNotEnabledError(reason),
  },
  {
    check: async ({ server }) => {
      return server.searchInferenceEndpoints
        ? { met: true }
        : {
            met: false,
            reason:
              'The inference endpoints feature is not available. Significant events requires inference connectors.',
          };
    },
    toError: (reason) => new FeatureNotEnabledError(reason),
  },
  {
    check: async ({ server }) => {
      return server.agentBuilder
        ? { met: true }
        : {
            met: false,
            reason:
              'Agent Builder is not available in this environment. Significant events relies on Agent Builder.',
          };
    },
    toError: (reason) => new FeatureNotEnabledError(reason),
  },
];

/**
 * Asserts that every significant events requirement is met. Throws the
 * requirement-specific error for the first unmet requirement (preserving its
 * error type/status code).
 */
export async function assertSignificantEventsAccess(
  context: SignificantEventsAccessContext
): Promise<void> {
  const results = await Promise.all(
    significantEventsRequirements.map(async (requirement) => ({
      requirement,
      result: await requirement.check(context),
    }))
  );

  const firstUnmet = results.find(({ result }) => !result.met);
  if (firstUnmet && !firstUnmet.result.met) {
    throw firstUnmet.requirement.toError(firstUnmet.result.reason);
  }
}
