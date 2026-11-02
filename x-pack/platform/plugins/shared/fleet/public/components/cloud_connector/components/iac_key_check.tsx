/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import {
  IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT,
  type IacKeyCheckAction,
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

/** Template details of a rendered template, in the shape the connector API stores it. */
export interface IacRenderedTemplate {
  iac_key: string;
  iac_blueprint_id?: string;
  iac_blueprint_version?: string;
}

/** What a rendered template belongs to: the identity and the exact integration set it was rendered for. */
export interface IacTemplateLaunchedFor {
  cloudConnectorId: string;
  integrations: RenderIacTemplateIntegration[];
}

export interface IacKeyCheckProps {
  cloudConnectorId: string | undefined;
  /** Integrations the connector will have to cover on top of its saved package policies. */
  integrations: RenderIacTemplateIntegration[];
  cloud?: CloudSetupForCloudConnector;
  accountType?: AccountType;
  iacTemplateUrl?: string;
  onValidityChange?: (isValid: boolean) => void;
  /**
   * Store the rendered key and blueprint on the connector as soon as the Update click renders
   * (default). Hosts that must not record the template before their own flow succeeds pass
   * false and take the template details from `onTemplateRecorded` instead.
   */
  writeOnRender?: boolean;
  /**
   * Called with the rendered template details when `writeOnRender` is false, together with the
   * identity and the integration set the update was launched for. The render is asynchronous, so
   * by the time it lands the host may have selected another identity or changed the selection;
   * the details belong to this identity and this set.
   */
  onTemplateRecorded?: (iac: IacRenderedTemplate, launchedFor: IacTemplateLaunchedFor) => void;
}

/**
 * Asks the server whether the connector's deployed template covers its saved policies plus
 * `integrations`, and offers the CloudFormation update when it does not. Only the AWS onboarding
 * renders it, so its telemetry reports the 'onboarding' surface.
 */
export const IacKeyCheck: React.FC<IacKeyCheckProps> = ({
  cloudConnectorId,
  integrations,
  cloud,
  accountType,
  iacTemplateUrl,
  onValidityChange,
  writeOnRender = true,
  onTemplateRecorded,
}) => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const { analytics, http } = useStartServices();

  const isCheckEnabled = isIacProvisionerEnabled && integrations.length > 0;

  const { data, isInitialLoading } = useVerifyIacKey({
    cloudConnectorId,
    integrations,
    enabled: isCheckEnabled,
  });

  const queryClient = useQueryClient();

  // What the user launched the stack update for: the identity AND the integration set the
  // template was rendered for. Bound to both rather than a bare boolean so a change of either
  // resets it on its own: a launch says nothing about another identity, nor about a set widened
  // after the click (the host also keys this component by both).
  const integrationsKey = useMemo(() => JSON.stringify(integrations), [integrations]);
  const [launchedFor, setLaunchedFor] = useState<
    { connectorId: string; integrationsKey: string } | undefined
  >(undefined);
  const updateLaunched =
    launchedFor !== undefined &&
    launchedFor.connectorId === cloudConnectorId &&
    launchedFor.integrationsKey === integrationsKey;

  const onTemplateRecordedRef = useRef(onTemplateRecorded);
  onTemplateRecordedRef.current = onTemplateRecorded;

  const onTemplateRendered = useCallback(
    ({ key, blueprintId, blueprintVersion }: TemplateRendered) => {
      // Runs on the "Update CloudFormation stack" click, once the render succeeded and the console
      // has opened on it (never when a pop-up blocker kept it closed). Kibana cannot observe the
      // user applying the update in AWS, so the launch itself is what lifts the block ("let them
      // finish"): the callout switches to its launched state and the host is told the identity is
      // ready.
      if (!key || !cloudConnectorId) {
        return;
      }
      setLaunchedFor({ connectorId: cloudConnectorId, integrationsKey });

      if (!writeOnRender) {
        // The host records the template details once its own flow succeeds (the onboarding writes it
        // after Deploy), so a launch the user never applies leaves the connector untouched.
        onTemplateRecordedRef.current?.(
          {
            iac_key: key,
            iac_blueprint_id: blueprintId,
            iac_blueprint_version: blueprintVersion,
          },
          { cloudConnectorId, integrations }
        );
        return;
      }

      // Click-time write. Raw request: no success toast, the user only asked to open the console.
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
    },
    [cloudConnectorId, http, integrations, integrationsKey, queryClient, writeOnRender]
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
      // would downgrade it.
      staticTemplateFallback: false,
      onTemplateRendered,
    });

  // A missing key blocks like a mismatched one: either way the deployed template is not known to
  // cover the selection.
  const isBlocking =
    data?.matches === false && (data.reason === 'key_mismatch' || data.reason === 'no_key');
  // The block lasts until the user has launched the update; Kibana cannot see them apply it.
  const isValid = !isBlocking || updateLaunched;
  // No verdict yet and one is on its way. Not the same as "no data": a failed check (fail open)
  // and a check waiting for a connector to be selected both leave `data` undefined without
  // being pending.
  const isAwaitingFirstVerdict = isInitialLoading;

  // Report validity only when it changes. Hosts may re-create the callback on every update, so
  // depending on its identity here would re-fire this effect after each update it causes — an
  // infinite render loop (seen as a "page unresponsive" prompt during the 2026-09-09 walkthrough).
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
    // pessimistic themselves, as AwsIdentityFederationSetup does.
    if (isAwaitingFirstVerdict) {
      return;
    }
    if (lastReportedValidityRef.current === isValid) {
      return;
    }
    lastReportedValidityRef.current = isValid;
    onValidityChangeRef.current?.(isValid);
  }, [isAwaitingFirstVerdict, isValid, isCheckEnabled]);

  const reportAction = useCallback(
    (action: IacKeyCheckAction) => {
      if (data?.reason) {
        analytics.reportEvent(IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT.eventType, {
          surface: 'onboarding',
          action,
          reason: data.reason,
          hasDeploymentId: Boolean(data.deploymentId),
        });
      }
    },
    [analytics, data]
  );

  if (!data || data.matches) {
    return null;
  }

  return (
    <>
      <IacKeyCheckCallout
        result={data}
        integrationCount={integrations.length}
        onUpdateStack={() => {
          reportAction('update_stack_clicked');
          if ('onClick' in launchButtonProps) {
            launchButtonProps.onClick();
          }
        }}
        isUpdating={isGeneratingTemplate}
        updateLaunched={updateLaunched}
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
