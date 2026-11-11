/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { SERVICE_SETTINGS_SESSION_KEY } from '../service_settings_step/use_service_settings';
import { useOnboardingSO } from './use_onboarding_so';
import type { DeployGroup } from './deploy_groups';
import {
  applyDedicatedNamespaceTemplates,
  getGlobalNamespacePackages,
} from './apply_dedicated_templates';

/**
 * Whether the switch was turned off since this run started. The apply runs in the background, and
 * the user can go back and turn it off before it finishes. Step 2 saves that choice as off at once,
 * so a callback that saves it as on afterwards would bring it back when the deployment is reopened.
 */
const wasSwitchTurnedOff = (): boolean => {
  try {
    const stored = window.sessionStorage.getItem(SERVICE_SETTINGS_SESSION_KEY);
    return stored !== null && JSON.parse(stored)?.dedicatedNamespaceTemplates === false;
  } catch {
    return false;
  }
};

interface UseApplyDedicatedTemplatesParams {
  /** Whether the switch is on. */
  enabled: boolean;
  /** Whether every policy of the deploy exists, so the packages are installed. */
  isDeployDone: boolean;
  groups: DeployGroup[];
  globalNamespace: string;
}

/**
 * Opts the global namespace in to dedicated index templates when a deploy finishes, and returns
 * the same action to call by hand. The state-driven run covers a deploy that finishes while the
 * step is shown, such as managed integrations reaching Done. It does not run for a step that is
 * mounted already done, so reopening a deployment never writes the shared list on its own. A step
 * that deploys and navigates away in one go, as agent-based does on Next, unmounts before the state
 * changes, so Next calls the action itself. Either way a request that was already made, or a
 * package that already has the namespace, is left alone.
 */
export const useApplyDedicatedTemplates = ({
  enabled,
  isDeployDone,
  groups,
  globalNamespace,
}: UseApplyDedicatedTemplatesParams): (() => Promise<void>) => {
  const {
    services: { notifications },
  } = useKibana<CoreStart>();
  const { detectAndReviewStep } = useOnboardingFlow();
  const { updateDeployment } = useOnboardingSO();
  const deploymentId = detectAndReviewStep?.onboardingDeploymentId;
  const lastRequestRef = useRef<string>();
  const wasDeployDoneRef = useRef(isDeployDone);

  const apply = useCallback(async () => {
    if (!enabled) return;
    const packageNames = getGlobalNamespacePackages(groups, globalNamespace);
    if (packageNames.length === 0) return;

    const request = `${globalNamespace}|${[...packageNames].sort().join(',')}`;
    if (lastRequestRef.current === request) return;
    lastRequestRef.current = request;

    const { failedPackages, blockedDataStreams, overriddenDataStreams } =
      await applyDedicatedNamespaceTemplates(packageNames, globalNamespace);
    if (blockedDataStreams.length > 0 || overriddenDataStreams.length > 0) {
      const details = [
        blockedDataStreams.length > 0
          ? i18n.translate('xpack.ingestHub.dedicatedNamespaceTemplates.blockedText', {
              defaultMessage:
                "Existing index templates take priority, so the dedicated index templates don't apply to: {dataStreams}.",
              values: { dataStreams: blockedDataStreams.join(', ') },
            })
          : undefined,
        overriddenDataStreams.length > 0
          ? i18n.translate('xpack.ingestHub.dedicatedNamespaceTemplates.overriddenText', {
              defaultMessage:
                'The dedicated index templates now take priority over your existing custom index templates, so the custom settings no longer apply to: {dataStreams}.',
              values: { dataStreams: overriddenDataStreams.join(', ') },
            })
          : undefined,
      ].filter(Boolean);
      notifications.toasts.addWarning({
        title: i18n.translate('xpack.ingestHub.dedicatedNamespaceTemplates.conflictTitle', {
          defaultMessage: 'Check the dedicated index templates for "{namespace}"',
          values: { namespace: globalNamespace },
        }),
        text: `${details.join(' ')} ${i18n.translate(
          'xpack.ingestHub.dedicatedNamespaceTemplates.conflictReview',
          { defaultMessage: 'Review them in Fleet.' }
        )}`,
      });
    }
    if (failedPackages.length === 0) {
      // Saved here, where the saved namespace is the one just applied, so the two cannot disagree.
      // A first deploy has no record yet; the deploy creates it with the switch.
      if (deploymentId && !wasSwitchTurnedOff()) {
        updateDeployment(deploymentId, { dedicatedNamespaceTemplates: true });
      }
      return;
    }
    // Forget the request so a later change of the settings tries again.
    lastRequestRef.current = undefined;
    notifications.toasts.addWarning({
      title: i18n.translate('xpack.ingestHub.dedicatedNamespaceTemplates.applyErrorTitle', {
        defaultMessage: 'Could not enable dedicated index templates',
      }),
      text: i18n.translate('xpack.ingestHub.dedicatedNamespaceTemplates.applyErrorText', {
        defaultMessage:
          'Dedicated index templates weren\'t turned on for the "{namespace}" namespace in: {packages}. Check that the namespace matches an allowed prefix for this space, then turn them on in the integration settings in Fleet.',
        values: { namespace: globalNamespace, packages: failedPackages.join(', ') },
      }),
    });
  }, [enabled, groups, globalNamespace, notifications, deploymentId, updateDeployment]);

  useEffect(() => {
    // Only a deploy that finishes while this is mounted: a step that opens already done is a resume.
    if (isDeployDone && !wasDeployDoneRef.current) apply();
    wasDeployDoneRef.current = isDeployDone;
  }, [isDeployDone, apply]);

  return apply;
};
