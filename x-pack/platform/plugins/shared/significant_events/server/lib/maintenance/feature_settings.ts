/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import type { GetScopedClients } from '../../routes/types';
import { SCHEDULED_MAINTENANCE_WORKFLOW_IDS } from './managed_workflow_targets';

/**
 * Snapshot of feature toggles that Pause turned off so Resume can restore only
 * what was previously enabled (and leave previously-disabled features alone).
 */
export interface PausedFeatureSettings {
  continuousOnboardingWasEnabled: boolean;
  scheduledDiscoveryEnabledSpaceIds: string[];
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Failure targets for the settings step. */
const CONTINUOUS_SETTING_TARGET = 'settings:continuous-onboarding';
const SCHEDULED_SETTING_TARGET_PREFIX = 'settings:scheduled-discovery@';
const scheduledSettingTarget = (spaceId: string): string =>
  `${SCHEDULED_SETTING_TARGET_PREFIX}${spaceId}`;

export const isContinuousOnboardingWorkflowId = (workflowId: string): boolean =>
  workflowId === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID ||
  workflowId === LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID;

export const isScheduledDiscoveryWorkflowId = (workflowId: string): boolean =>
  SCHEDULED_MAINTENANCE_WORKFLOW_IDS.some(
    (baseId) => workflowId === baseId || workflowId.startsWith(`${baseId}-`)
  );

/** Whether Resume should turn this settings-backed workflow back on. */
export const shouldRestoreSettingsBackedWorkflow = (
  workflow: { id: string; spaceId: string },
  pausedSettings: PausedFeatureSettings | undefined
): boolean => {
  if (isContinuousOnboardingWorkflowId(workflow.id)) {
    return pausedSettings?.continuousOnboardingWasEnabled === true;
  }
  if (isScheduledDiscoveryWorkflowId(workflow.id)) {
    return pausedSettings?.scheduledDiscoveryEnabledSpaceIds.includes(workflow.spaceId) === true;
  }
  // Not gated by the Settings toggles — always eligible for resume.
  return true;
};

const requestForSpace = (request: KibanaRequest, spaceId: string): KibanaRequest => {
  const fakeRawRequest: FakeRawRequest = {
    headers: request.headers,
    path: '/',
    spaceId: asSpaceId(spaceId),
  };
  return kibanaRequestFactory(fakeRawRequest);
};

export const createFeatureSettingsController = ({
  server,
  getScopedClients,
}: {
  server: StreamsServer;
  getScopedClients: GetScopedClients;
}) => {
  const getGlobalClient = async (request: KibanaRequest): Promise<IUiSettingsClient> => {
    const { globalUiSettingsClient } = await getScopedClients({ request });
    return globalUiSettingsClient;
  };

  const getSpaceClient = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<IUiSettingsClient> => {
    const spaceRequest = requestForSpace(request, spaceId);
    const soClient = server.core.savedObjects.getScopedClient(spaceRequest);
    return server.core.uiSettings.asScopedToClient(soClient);
  };

  /**
   * Turns continuous onboarding + per-space scheduled discovery settings off,
   * recording which were previously on. Idempotent across re-pause: prior
   * restore flags are kept when settings are already false from an earlier pause.
   */
  const pauseFeatureSettings = async ({
    request,
    spaceIds,
    previous,
    failures,
  }: {
    request: KibanaRequest;
    spaceIds: string[];
    previous: PausedFeatureSettings | undefined;
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<PausedFeatureSettings> => {
    const next: PausedFeatureSettings = {
      continuousOnboardingWasEnabled: previous?.continuousOnboardingWasEnabled ?? false,
      scheduledDiscoveryEnabledSpaceIds: [
        ...new Set(previous?.scheduledDiscoveryEnabledSpaceIds ?? []),
      ],
    };

    try {
      const globalClient = await getGlobalClient(request);
      let continuousEnabled = false;
      try {
        continuousEnabled = Boolean(
          await globalClient.get<boolean>(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED)
        );
      } catch (error) {
        failures.push({
          target: CONTINUOUS_SETTING_TARGET,
          error: `Failed to read continuous onboarding setting: ${toMessage(error)}`,
        });
        // Uncertain read: prefer restore on resume over leaving continuous
        // onboarding permanently off after a partial pause.
        next.continuousOnboardingWasEnabled = true;
      }
      // Record restore intent from a successful read even if the write fails, so
      // Resume can still recover the setting after a partial pause.
      if (continuousEnabled) {
        next.continuousOnboardingWasEnabled = true;
      }
      if (continuousEnabled || next.continuousOnboardingWasEnabled) {
        try {
          await globalClient.set(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED, false);
        } catch (error) {
          failures.push({
            target: CONTINUOUS_SETTING_TARGET,
            error: `Failed to pause continuous onboarding setting: ${toMessage(error)}`,
          });
        }
      }
    } catch (error) {
      failures.push({
        target: CONTINUOUS_SETTING_TARGET,
        error: `Failed to pause continuous onboarding setting: ${toMessage(error)}`,
      });
    }

    for (const spaceId of spaceIds) {
      try {
        const spaceClient = await getSpaceClient(request, spaceId);
        let scheduledEnabled = false;
        try {
          scheduledEnabled = Boolean(
            await spaceClient.get<boolean>(
              OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
            )
          );
        } catch (error) {
          failures.push({
            target: scheduledSettingTarget(spaceId),
            error: `Failed to read scheduled discovery setting: ${toMessage(error)}`,
          });
          // Uncertain read: prefer restore on resume for this space.
          if (!next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
            next.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
          }
        }
        if (scheduledEnabled && !next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
          next.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
        }
        if (scheduledEnabled || next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
          try {
            await spaceClient.set(
              OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
              false
            );
          } catch (error) {
            failures.push({
              target: scheduledSettingTarget(spaceId),
              error: `Failed to pause scheduled discovery setting: ${toMessage(error)}`,
            });
          }
        }
      } catch (error) {
        failures.push({
          target: scheduledSettingTarget(spaceId),
          error: `Failed to pause scheduled discovery setting: ${toMessage(error)}`,
        });
      }
    }

    return next;
  };

  /** Restores only the feature settings Pause recorded as previously enabled. */
  const resumeFeatureSettings = async ({
    request,
    pausedSettings,
    failures,
  }: {
    request: KibanaRequest;
    pausedSettings: PausedFeatureSettings | undefined;
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<void> => {
    if (!pausedSettings) {
      return;
    }

    if (pausedSettings.continuousOnboardingWasEnabled) {
      try {
        const globalClient = await getGlobalClient(request);
        await globalClient.set(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED, true);
      } catch (error) {
        failures.push({
          target: CONTINUOUS_SETTING_TARGET,
          error: `Failed to resume continuous onboarding setting: ${toMessage(error)}`,
        });
      }
    }

    for (const spaceId of pausedSettings.scheduledDiscoveryEnabledSpaceIds) {
      try {
        const spaceClient = await getSpaceClient(request, spaceId);
        await spaceClient.set(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
          true
        );
      } catch (error) {
        failures.push({
          target: scheduledSettingTarget(spaceId),
          error: `Failed to resume scheduled discovery setting: ${toMessage(error)}`,
        });
      }
    }
  };

  /** Live feature-toggle values for the caller's space (for UI sync). */
  const readFeatureSettingsStatus = async (
    request: KibanaRequest
  ): Promise<{
    continuousOnboardingEnabled: boolean;
    scheduledDiscoveryEnabled: boolean;
  }> => {
    const { globalUiSettingsClient, uiSettingsClient } = await getScopedClients({ request });
    const [continuousOnboardingEnabled, scheduledDiscoveryEnabled] = await Promise.all([
      globalUiSettingsClient
        .get<boolean>(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED)
        .then(Boolean),
      uiSettingsClient
        .get<boolean>(OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED)
        .then(Boolean),
    ]);
    return { continuousOnboardingEnabled, scheduledDiscoveryEnabled };
  };

  /**
   * While paused, keep feature settings off if something turned them back on
   * (e.g. a stale client). Does not change the restore snapshot.
   */
  const reassertFeatureSettingsOff = async ({
    request,
    spaceIds,
    failures,
  }: {
    request: KibanaRequest;
    spaceIds: string[];
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<void> => {
    try {
      const globalClient = await getGlobalClient(request);
      await globalClient.set(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED, false);
    } catch (error) {
      failures.push({
        target: CONTINUOUS_SETTING_TARGET,
        error: `Failed to keep continuous onboarding off while paused: ${toMessage(error)}`,
      });
    }

    for (const spaceId of spaceIds) {
      try {
        const spaceClient = await getSpaceClient(request, spaceId);
        await spaceClient.set(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
          false
        );
      } catch (error) {
        failures.push({
          target: scheduledSettingTarget(spaceId),
          error: `Failed to keep scheduled discovery off while paused: ${toMessage(error)}`,
        });
      }
    }
  };

  return {
    pauseFeatureSettings,
    resumeFeatureSettings,
    readFeatureSettingsStatus,
    reassertFeatureSettingsOff,
  };
};

export type FeatureSettingsController = ReturnType<typeof createFeatureSettingsController>;
