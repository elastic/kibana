/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useHistory, useParams } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import {
  sendCreateCloudOnboardingDeployment,
  sendUpdateCloudOnboardingDeployment,
} from '@kbn/fleet-plugin/public';

import { useOnboardingFlow } from '../onboarding_flow_context';
import { getOnboardingSessionKey } from '../onboarding_session_storage';
import { DeploymentMethodCard } from './authenticate_and_deploy_step/deployment_method_card';
import { ManagedIntegrationsSection } from './authenticate_and_deploy_step/managed_integrations_section';
import { useDeploy, toSOServiceVars } from './authenticate_and_deploy_step/use_deploy';
import {
  useEcfDeployment,
  EcfDeploymentSection,
} from './ecf_deployment_section';
import {
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
} from '../ecf_cloudformation';
import {
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceSettingsPersistedState,
} from './service_settings_step/use_service_settings';

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

interface AuthenticateAndDeployStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function AuthenticateAndDeployStep({ onContinue, onBack }: AuthenticateAndDeployStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { servicesStep, awsServicesMap, deploymentMethod, setDeploymentMethod, updateDetectAndReviewStep } =
    useOnboardingFlow();
  const { selectedServiceIds, dataFormat } = servicesStep;
  const history = useHistory();
  const { integrationId } = useParams<{ integrationId: string }>();

  // ── Service settings (region + vars) ─────────────────────────────────────────
  // Read from session storage so ECF URLs can be pre-filled without re-entering data.
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const { globalRegion, serviceVars } = serviceSettings ?? DEFAULT_SERVICE_SETTINGS;

  const otlpEndpoint = services.cloud?.managedOtlp?.url;

  // ECF instances: prefer session-storage instances because they carry duplicate-instance ARNs
  // (multi-bucket / multi-log-group configs from Step 2). Fall back to one base instance per
  // selected service when session storage hasn't been written yet — e.g. the user jumped to
  // Step 3 directly via the horizontal step indicator without clicking Next in Step 2.
  const ecfInstances = useMemo(() => {
    const stored = serviceSettings?.instances;
    if (stored && stored.length > 0) return stored;
    return selectedServiceIds.flatMap((id) => {
      const service = awsServicesMap?.get(id);
      if (!service?.showInUI) return [];
      return [{ instanceId: id, serviceId: id, name: service.name, isDuplicate: false }];
    });
  }, [serviceSettings?.instances, selectedServiceIds, awsServicesMap]);

  // ── Managed Integrations ──────────────────────────────────────────────────────
  const { handleDeploy, isDeploying, failedInstances, isAlreadyDeployed } = useDeploy({
    onContinue: () => {},
  });
  const [deployAttempted, setDeployAttempted] = useState(false);
  const isMiDone =
    isAlreadyDeployed || (deployAttempted && !isDeploying && failedInstances.length === 0);
  // hasFailed is NOT gated on deployAttempted: if the hook is seeded with persisted failures on
  // remount (after navigating Back/Next), the callout and Retry must still appear even though no
  // deploy was attempted in this component lifetime.
  const hasFailed = !isDeploying && failedInstances.length > 0;

  const handleDeployClick = useCallback(() => {
    setDeployAttempted(true);
    if (failedInstances.length > 0) {
      handleDeploy(failedInstances);
    } else {
      handleDeploy();
    }
  }, [handleDeploy, failedInstances]);

  const miServiceIds = useMemo(
    () =>
      selectedServiceIds.filter((id) =>
        awsServicesMap?.get(id)?.deploymentMethods.some((dm) => dm.method === 'managed_integration')
      ),
    [selectedServiceIds, awsServicesMap]
  );

  const showIdentityFederation = useMemo(() => {
    if (miServiceIds.length === 0) return true;
    return miServiceIds.every(
      (id) => awsServicesMap?.get(id)?.identityFederationSupported !== false
    );
  }, [miServiceIds, awsServicesMap]);

  // ── Elastic Cloud Forwarder ───────────────────────────────────────────────────
  const {
    hasAnyEcf,
    isDone: isEcfDone,
    sectionProps: ecfSectionProps,
  } = useEcfDeployment({
    instances: ecfInstances,
    serviceVars,
    globalRegion,
    otlpEndpoint,
    dataFormat,
  });

  // ── ECF-only SO persistence ───────────────────────────────────────────────────
  const [isSavingSO, setIsSavingSO] = useState(false);

  const handleNext = useCallback(async () => {
    // When only ECF services are selected, no handleDeploy runs, so the SO must be created here.
    if (miServiceIds.length === 0 && hasAnyEcf) {
      setIsSavingSO(true);
      const defaultNames: Record<string, string> = {
        unified: ECF_UNIFIED_STACK_NAME,
        otel: ECF_OTEL_STACK_NAME,
        crowdstrike: ECF_CROWDSTRIKE_STACK_NAME,
      };
      const ecfStacks = ecfSectionProps.launchedFamilies
        .map((family) => {
          const version = ecfSectionProps.stackVersions[family];
          if (!version) return null;
          return {
            family,
            stackName: ecfSectionProps.stackNames[family] || defaultNames[family],
            templateVersion: version,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const createResp = await sendCreateCloudOnboardingDeployment({
        provider: 'aws',
        mechanisms: ['cloud_forwarder'],
        services: selectedServiceIds,
        serviceVars: toSOServiceVars(serviceVars, awsServicesMap ?? new Map()) as Record<
          string,
          Record<string, unknown>
        >,
        globalRegion,
        dataFormat,
      }).catch(() => {
        services.notifications.toasts.addDanger(
          i18n.translate('xpack.ingestHub.authenticateAndDeployStep.soCreateError', {
            defaultMessage:
              'Could not save deployment record. Deploy will proceed, but resume may not be available.',
          })
        );
        return null;
      });

      const deploymentId = createResp?.item?.id;
      if (deploymentId) {
        await sendUpdateCloudOnboardingDeployment(deploymentId, {
          status: 'succeeded',
          ecfStacks,
        }).catch(() => {
          services.notifications.toasts.addDanger(
            i18n.translate('xpack.ingestHub.authenticateAndDeployStep.soUpdateError', {
              defaultMessage:
                'Could not update deployment record. Deploy outcome may not be reflected on resume.',
            })
          );
        });

        updateDetectAndReviewStep({ onboardingDeploymentId: deploymentId });
        sessionStorage.setItem(
          getOnboardingSessionKey(integrationId, 'hydratedDeploymentId'),
          deploymentId
        );
        history.replace({
          ...history.location,
          search: `?deploymentId=${deploymentId}`,
        });
      }
      setIsSavingSO(false);
    }
    onContinue();
  }, [
    miServiceIds.length,
    hasAnyEcf,
    ecfSectionProps,
    selectedServiceIds,
    serviceVars,
    awsServicesMap,
    globalRegion,
    dataFormat,
    services,
    updateDetectAndReviewStep,
    history,
    integrationId,
    onContinue,
  ]);

  // ── Next button gating ────────────────────────────────────────────────────────
  // Disabled until every active deployment section reports done.
  const isNextDisabled =
    (miServiceIds.length > 0 && !isMiDone) || (hasAnyEcf && !isEcfDone) || isSavingSO;

  return (
    <div data-test-subj="onboardingStep-authenticate-and-deploy">
      <DeploymentMethodCard selectedMethod={deploymentMethod} onChange={setDeploymentMethod} />

      {miServiceIds.length > 0 && <EuiHorizontalRule margin="l" />}

      {miServiceIds.length > 0 && (
        <ManagedIntegrationsSection
          serviceCount={miServiceIds.length}
          showIdentityFederation={showIdentityFederation}
          onDeploy={handleDeployClick}
          isDeploying={isDeploying}
          isDone={isMiDone}
          hasFailed={hasFailed}
        />
      )}

      {hasAnyEcf && <EuiHorizontalRule margin="l" />}

      {hasAnyEcf && <EcfDeploymentSection {...ecfSectionProps} />}

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onBack && (
            <EuiButtonEmpty iconType="chevronSingleLeft" iconSide="left" onClick={onBack}>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.backButton"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleNext}
            isDisabled={isNextDisabled}
            isLoading={isSavingSO}
            data-test-subj="authenticateAndDeployStep-nextButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.nextButton"
              defaultMessage="Next"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
