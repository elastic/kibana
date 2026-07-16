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
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import type { GetScopedClients } from '../../routes/types';
import {
  CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
} from './managed_workflow_targets';

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

export const emptyPausedFeatureSettings = (): PausedFeatureSettings => ({
  continuousOnboardingWasEnabled: false,
  scheduledDiscoveryEnabledSpaceIds: [],
});

export const isContinuousOnboardingWorkflowId = (documentId: string): boolean =>
  documentId === CONTINUOUS_ONBOARDING_WORKFLOW_ID ||
  documentId === LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID;

export const isScheduledDiscoveryWorkflowId = (documentId: string): boolean =>
  SCHEDULED_MAINTENANCE_WORKFLOW_IDS.some(
    (baseId) => documentId === baseId || documentId.startsWith(`${baseId}-`)
  );

/** Whether Resume should turn this settings-backed workflow back on. */
export const shouldRestoreSettingsBackedWorkflow = (
  workflow: { id: string; spaceId: string },
  pausedSettings: PausedFeatureSettings | undefined
): boolean => {
  // Pre-v2 pause snapshots have no settings flags — restore every recorded workflow
  // (settings were not turned off by those older pauses either).
  if (!pausedSettings) {
    return true;
  }
  if (isContinuousOnboardingWorkflowId(workflow.id)) {
    return pausedSettings.continuousOnboardingWasEnabled;
  }
  if (isScheduledDiscoveryWorkflowId(workflow.id)) {
    return pausedSettings.scheduledDiscoveryEnabledSpaceIds.includes(workflow.spaceId);
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
      const continuousEnabled = Boolean(
        await globalClient.get<boolean>(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED)
      );
      if (continuousEnabled) {
        await globalClient.set(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED, false);
        next.continuousOnboardingWasEnabled = true;
      } else if (next.continuousOnboardingWasEnabled) {
        // Re-pause: keep the restore flag; ensure the setting stays off.
        await globalClient.set(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED, false);
      }
    } catch (error) {
      failures.push({
        target: 'settings:continuous-onboarding',
        error: `Failed to pause continuous onboarding setting: ${toMessage(error)}`,
      });
    }

    for (const spaceId of spaceIds) {
      try {
        const spaceClient = await getSpaceClient(request, spaceId);
        const scheduledEnabled = Boolean(
          await spaceClient.get<boolean>(
            OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
          )
        );
        if (scheduledEnabled) {
          await spaceClient.set(
            OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
            false
          );
          if (!next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
            next.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
          }
        } else if (next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
          await spaceClient.set(
            OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
            false
          );
        }
      } catch (error) {
        failures.push({
          target: `settings:scheduled-discovery@${spaceId}`,
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
          target: 'settings:continuous-onboarding',
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
          target: `settings:scheduled-discovery@${spaceId}`,
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
        target: 'settings:continuous-onboarding',
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
          target: `settings:scheduled-discovery@${spaceId}`,
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
