/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import {
  IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT,
  type IacKeyCheckAction,
  type IacKeySurface,
} from '../../../../common/telemetry/iac_provisioner_events';
import type { RenderIacTemplateIntegration } from '../../../../common/types/rest_spec/iac_provisioner';
import type { AccountType } from '../../../types';
import { useIacProvisioner, useStartServices } from '../../../hooks';
import { useVerifyIacKey } from '../hooks/use_verify_iac_key';
import { updateCloudConnector } from '../hooks/use_update_cloud_connector';
import {
  useCloudConnectorTemplate,
  type TemplateRendered,
} from '../hooks/use_cloud_connector_template';
import type { CloudSetupForCloudConnector } from '../types';
import { AWS_PROVIDER } from '../constants';

import { IacKeyCheckCallout } from './iac_key_check_callout';

export interface IacKeyCheckProps {
  cloudConnectorId: string | undefined;
  /** Integrations the connector will have to cover on top of its saved package policies. */
  integrations: RenderIacTemplateIntegration[];
  /** Named in the callout copy; omit on multi-package surfaces. */
  integrationTitle?: string;
  cloud?: CloudSetupForCloudConnector;
  accountType?: AccountType;
  iacTemplateUrl?: string;
  /** Telemetry surface this check and its callout actions report as. */
  surface?: Extract<IacKeySurface, 'wizard' | 'onboarding'>;
  onValidityChange?: (isValid: boolean) => void;
}

/**
 * Asks the server whether the connector's deployed template covers its saved policies plus
 * `integrations`, and offers the CloudFormation update when it does not.
 */
export const IacKeyCheck: React.FC<IacKeyCheckProps> = ({
  cloudConnectorId,
  integrations,
  integrationTitle,
  cloud,
  accountType,
  iacTemplateUrl,
  surface = 'wizard',
  onValidityChange,
}) => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const { analytics, http } = useStartServices();

  const isCheckEnabled = isIacProvisionerEnabled && integrations.length > 0;

  const { data, isFetching, isInitialLoading, refetch } = useVerifyIacKey({
    cloudConnectorId,
    integrations,
    surface,
    enabled: isCheckEnabled,
  });

  const queryClient = useQueryClient();

  const onTemplateRendered = useCallback(
    ({ key, blueprintId, blueprintVersion }: TemplateRendered) => {
      // Runs on the "Update CloudFormation stack" click, once the render succeeds and before the
      // console opens. Kibana cannot observe the user applying the update in AWS, so the key and
      // its blueprint provenance are stored at click time
      // (https://github.com/elastic/ingest-dev/issues/9415). Raw request: no success toast, the
      // user only asked to open the console.
      if (key && cloudConnectorId) {
        updateCloudConnector(http, cloudConnectorId, {
          iac_key: key,
          iac_blueprint_id: blueprintId,
          iac_blueprint_version: blueprintVersion,
        })
          .then(() => {
            queryClient.invalidateQueries(['get-cloud-connectors']);
            queryClient.invalidateQueries(['cloud-connector-usage', cloudConnectorId]);
          })
          .catch(() => {
            // Silent: the daily iac_upgrade_check task self-heals key mismatches.
          });
      }
    },
    [cloudConnectorId, http, queryClient]
  );

  const { launchButtonProps, isGeneratingTemplate, templateGenerationError } =
    useCloudConnectorTemplate({
      provider: AWS_PROVIDER,
      cloud,
      accountType: accountType ?? 'single-account',
      iacTemplateUrl,
      integrations: data?.integrations,
      deploymentId: data?.deploymentId,
      // This identity already has a generated template; sending the user to the static one
      // would downgrade it (https://github.com/elastic/ingest-dev/issues/9415).
      staticTemplateFallback: false,
      onTemplateRendered,
    });

  const isBlocking = data?.matches === false && data.reason === 'key_mismatch';
  // No verdict yet and one is on its way. Not the same as "no data": a failed check (fail open)
  // and a check waiting for a connector to be selected both leave `data` undefined without
  // being pending.
  const isAwaitingFirstVerdict = isInitialLoading;

  // Report validity only when the blocking state itself changes. Callers (e.g. the wizard's
  // updatePolicy) re-create the callback on every update, so depending on its identity here
  // would re-fire this effect after each update it causes — an infinite render loop (seen as a
  // "page unresponsive" prompt during the 2026-09-09 walkthrough).
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;
  const lastReportedValidityRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (!isCheckEnabled) {
      return;
    }
    // Say nothing until the first verdict lands. Reporting "valid" on mount would let a host
    // enable Save/Deploy for the whole verify round-trip; reporting "invalid" would hand hosts
    // that only forward a block (extension forms via cloud_connector_setup.tsx) a false that no
    // verdict backs and that they cannot clear. Hosts that must block during the round-trip start
    // pessimistic themselves, as AwsIdentityFederationSetup does
    // (https://github.com/elastic/ingest-dev/issues/9415).
    if (isAwaitingFirstVerdict) {
      return;
    }
    const isValid = !isBlocking;
    if (lastReportedValidityRef.current === isValid) {
      return;
    }
    lastReportedValidityRef.current = isValid;
    onValidityChangeRef.current?.(isValid);
  }, [isAwaitingFirstVerdict, isBlocking, isCheckEnabled]);

  const reportAction = useCallback(
    (action: IacKeyCheckAction) => {
      if (data?.reason) {
        analytics.reportEvent(IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT.eventType, {
          surface,
          action,
          reason: data.reason,
          hasDeploymentId: Boolean(data.deploymentId),
        });
      }
    },
    [analytics, data, surface]
  );

  if (!data || data.matches) {
    return null;
  }

  return (
    <>
      <IacKeyCheckCallout
        result={data}
        integrationTitle={integrationTitle}
        integrationCount={integrations.length}
        onUpdateStack={() => {
          reportAction('update_stack_clicked');
          if ('onClick' in launchButtonProps) {
            launchButtonProps.onClick();
          }
        }}
        isUpdating={isGeneratingTemplate}
        onVerify={() => {
          reportAction('verify_clicked');
          refetch();
        }}
        isVerifying={isFetching}
      />
      {templateGenerationError && (
        <>
          <EuiSpacer size="m" />
          <KbnDangerCallout
            announceOnMount
            data-test-subj={
              CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.IAC_CHECK_TEMPLATE_ERROR_CALLOUT
            }
            title={templateGenerationError}
            size="s"
          />
        </>
      )}
    </>
  );
};
