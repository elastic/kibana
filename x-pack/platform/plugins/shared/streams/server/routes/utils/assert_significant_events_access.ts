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

type RequirementCheckResult = { met: true } | { met: false; errorMessage: string };

interface SignificantEventsRequirement {
  /** Resolves whether the requirement is satisfied for the given context. */
  check: (context: SignificantEventsAccessContext) => Promise<RequirementCheckResult>;
  /** Builds the error thrown when the requirement is unmet. */
  toError: (errorMessage: string) => Error;
}

/**
 * Significant events depends on a handful of optional plugins simply being
 * present. To require a new plugin, add its name to this array.
 */
const requiredPlugins = [
  'workflowsExtensions',
  'searchInferenceEndpoints',
  'agentBuilder',
] as const satisfies ReadonlyArray<keyof StreamsServer>;

type RequiredPlugin = (typeof requiredPlugins)[number];

const requirePlugin = (plugin: RequiredPlugin): SignificantEventsRequirement => ({
  check: async ({ server }) =>
    server[plugin]
      ? { met: true }
      : {
          met: false,
          errorMessage: `The "${plugin}" plugin is not available in this environment. Significant events relies on it.`,
        },
  toError: (errorMessage) => new FeatureNotEnabledError(errorMessage),
});

/**
 * The single source of truth for everything that must be true for significant
 * events to work. Order matters: `assertSignificantEventsAccess` throws on the
 * first unmet requirement.
 */
const significantEventsRequirements: readonly SignificantEventsRequirement[] = [
  {
    check: async ({ server }) =>
      server.core.pricing.isFeatureAvailable(STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id)
        ? { met: true }
        : {
            met: false,
            errorMessage: 'Significant events is not available on the current pricing tier.',
          },
    toError: (errorMessage) => new SecurityError(errorMessage),
  },
  {
    check: async ({ licensing }) =>
      (await licensing.getLicense()).hasAtLeast('enterprise')
        ? { met: true }
        : {
            met: false,
            errorMessage: 'An Enterprise license or higher is required to use significant events.',
          },
    toError: (errorMessage) => forbidden(errorMessage),
  },
  {
    check: async ({ uiSettingsClient }) =>
      (await uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS))
        ? { met: true }
        : {
            met: false,
            errorMessage: `Significant events is disabled. Enable "${OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS}" in Advanced Settings to start using it.`,
          },
    toError: (errorMessage) => new FeatureNotEnabledError(errorMessage),
  },
  ...requiredPlugins.map(requirePlugin),
];

const evaluateRequirements = (context: SignificantEventsAccessContext) =>
  Promise.all(
    significantEventsRequirements.map(async (requirement) => ({
      requirement,
      result: await requirement.check(context),
    }))
  );

/**
 * Asserts that every significant events requirement is met. Throws the
 * requirement-specific error for the first unmet requirement (preserving its
 * error type/status code).
 */
export async function assertSignificantEventsAccess(
  context: SignificantEventsAccessContext
): Promise<void> {
  const results = await evaluateRequirements(context);

  for (const { requirement, result } of results) {
    if (!result.met) {
      throw requirement.toError(result.errorMessage);
    }
  }
}

/**
 * Returns whether every significant events requirement is met, without
 * throwing. Used by the availability endpoint that the UI calls.
 */
export async function isSignificantEventsAvailable(
  context: SignificantEventsAccessContext
): Promise<boolean> {
  const results = await evaluateRequirements(context);
  return results.every(({ result }) => result.met);
}
