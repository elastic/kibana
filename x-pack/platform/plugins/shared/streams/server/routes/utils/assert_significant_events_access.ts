/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { SignificantEventsAvailabilityResponse } from '../../../common';
import {
  SIGNIFICANT_EVENTS_REQUIRED_PLUGINS,
  STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE,
  type SignificantEventsRequiredPlugin,
  type SignificantEventsUnavailableReason,
} from '../../../common';
import { FeatureNotEnabledError } from '../../lib/streams/errors/feature_not_enabled_error';
import { MissingDependencyError } from '../../lib/streams/errors/missing_dependency_error';
import type { StreamsServer } from '../../types';

interface SignificantEventsAccessContext {
  server: StreamsServer;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
}

type RequirementCheckResult = { met: true } | { met: false; errorMessage: string };

interface SignificantEventsRequirement {
  /** Stable id surfaced to the UI to explain why significant events is unavailable. */
  id: SignificantEventsUnavailableReason;
  /** Resolves whether the requirement is satisfied for the given context. */
  check: (context: SignificantEventsAccessContext) => Promise<RequirementCheckResult>;
  /** Builds the error thrown when the requirement is unmet. */
  toError: (errorMessage: string) => Error;
}

const requirePlugin = (plugin: SignificantEventsRequiredPlugin): SignificantEventsRequirement => ({
  id: plugin,
  check: async ({ server }) =>
    server[plugin]
      ? { met: true }
      : {
          met: false,
          errorMessage: `Significant events requires the "${plugin}" plugin to be enabled first.`,
        },
  toError: (errorMessage) => new MissingDependencyError(errorMessage),
});

/**
 * The single source of truth for everything that must be true for significant
 * events to work. Order matters: `assertSignificantEventsAccess` throws on the
 * first unmet requirement.
 */
const significantEventsRequirements: readonly SignificantEventsRequirement[] = [
  {
    id: 'pricing_tier',
    check: async ({ server }) =>
      server.core.pricing.isFeatureAvailable(STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id)
        ? { met: true }
        : {
            met: false,
            errorMessage: 'Significant events is not available on the current pricing tier.',
          },
    toError: (errorMessage) => new FeatureNotEnabledError(errorMessage),
  },
  {
    id: 'license',
    check: async ({ licensing }) =>
      (await licensing.getLicense()).hasAtLeast('enterprise')
        ? { met: true }
        : {
            met: false,
            errorMessage: 'An Enterprise license or higher is required to use significant events.',
          },
    toError: (errorMessage) => new FeatureNotEnabledError(errorMessage),
  },
  {
    id: 'ui_setting',
    check: async ({ uiSettingsClient }) =>
      (await uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS))
        ? { met: true }
        : {
            met: false,
            errorMessage: `Significant events is disabled. Enable "${OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS}" in Advanced Settings to start using it.`,
          },
    toError: (errorMessage) => new FeatureNotEnabledError(errorMessage),
  },
  ...SIGNIFICANT_EVENTS_REQUIRED_PLUGINS.map(requirePlugin),
];

/**
 * Evaluates every requirement in parallel and returns the first unmet one (in
 * registry order), or `undefined` when significant events is fully available.
 */
const findFirstUnmetRequirement = async (
  context: SignificantEventsAccessContext
): Promise<{ requirement: SignificantEventsRequirement; errorMessage: string } | undefined> => {
  const results = await Promise.all(
    significantEventsRequirements.map(async (requirement) => ({
      requirement,
      result: await requirement.check(context),
    }))
  );

  for (const { requirement, result } of results) {
    if (!result.met) {
      return { requirement, errorMessage: result.errorMessage };
    }
  }

  return undefined;
};

/**
 * Asserts that every significant events requirement is met. Throws the
 * requirement-specific error for the first unmet requirement (preserving its
 * error type/status code).
 */
export async function assertSignificantEventsAccess(
  context: SignificantEventsAccessContext
): Promise<void> {
  const unmet = await findFirstUnmetRequirement(context);
  if (unmet) {
    throw unmet.requirement.toError(unmet.errorMessage);
  }
}

/**
 * Resolves significant events availability without throwing, returning the id
 * of the first unmet requirement. Used by the availability endpoint the UI calls.
 */
export async function getSignificantEventsAvailability(
  context: SignificantEventsAccessContext
): Promise<SignificantEventsAvailabilityResponse> {
  const unmet = await findFirstUnmetRequirement(context);
  return unmet ? { available: false, reason: unmet.requirement.id } : { available: true };
}
