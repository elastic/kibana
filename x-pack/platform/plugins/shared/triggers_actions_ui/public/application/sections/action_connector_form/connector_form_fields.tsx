/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, Suspense, useContext } from 'react';

import { EuiTitle, EuiSpacer, EuiErrorBoundary } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { connectorTypeIsDual, getConnectorSpec } from '@kbn/connector-specs';

import type { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { readClusterInboundEventsEnabled } from '../../lib/inbound_ingress';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorContext } from '../../context/connector_context';
import { ConnectorFormFieldsGlobal } from './connector_form_fields_global';
import {
  InboundEventsFormSection,
  OutboundFormSection,
  OutboundSectionTitle,
} from './inbound_events_form_section';

/** First auth type with credentials, when the spec also offers no authentication. */
const getOutboundToggleAuthTypeId = (actionTypeId: string | undefined): string | undefined => {
  const authTypeIds = (getConnectorSpec(actionTypeId ?? '')?.auth?.types ?? []).map((authType) =>
    typeof authType === 'string' ? authType : authType.type
  );
  if (!authTypeIds.includes('none')) {
    return undefined;
  }
  return authTypeIds.find((authTypeId) => authTypeId !== 'none');
};

interface ConnectorFormFieldsProps {
  actionTypeModel: ActionTypeModel | null;
  isEdit: boolean;
  registerPreSubmitValidator: (validator: ConnectorValidationFunc) => void;
  authMode?: 'shared' | 'per-user';
  /** Optional content rendered under Connector settings (e.g. inbound webhook URL). */
  settingsContent?: ReactNode;
  /** Saved inbound setting. Used to warn when turning a live dual connector off. */
  savedIsInboundEventsEnabled?: boolean;
  /** False on the add modal, which closes before a one-time ingest token can be shown. */
  showInboundEvents?: boolean;
}

const ConnectorFormFieldsComponent: React.FC<ConnectorFormFieldsProps> = ({
  actionTypeModel,
  isEdit,
  registerPreSubmitValidator,
  authMode,
  settingsContent,
  savedIsInboundEventsEnabled = false,
  showInboundEvents = true,
}) => {
  const services = useKibana().services;
  const connectorContext = useContext(ConnectorContext);
  const {
    application: { capabilities },
  } = services;
  const isClusterInboundEventsEnabled = readClusterInboundEventsEnabled(
    services,
    connectorContext?.services
  );
  const canSave = hasSaveActionsCapability(capabilities);
  const FieldsComponent = actionTypeModel?.actionConnectorFields ?? null;
  const actionTypeId = actionTypeModel?.id;
  const isDual = actionTypeId != null && connectorTypeIsDual(actionTypeId);
  const showDualInbound = isDual && isClusterInboundEventsEnabled && showInboundEvents;
  // Dual connectors that can run without credentials get an Outbound on/off switch.
  const outboundToggleAuthTypeId =
    isDual && showInboundEvents ? getOutboundToggleAuthTypeId(actionTypeId) : undefined;
  const showSettingsSection =
    FieldsComponent !== null || settingsContent != null || showDualInbound;
  const showSettingsTitle =
    !isDual &&
    (settingsContent != null || !Boolean(actionTypeModel?.connectorForm?.hideSettingsTitle));

  const fieldsComponent =
    FieldsComponent !== null ? (
      <EuiErrorBoundary>
        <Suspense
          fallback={
            <SectionLoading>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.loadingConnectorSettingsDescription"
                defaultMessage="Loading connector settings…"
              />
            </SectionLoading>
          }
        >
          <FieldsComponent
            readOnly={!canSave}
            isEdit={isEdit}
            registerPreSubmitValidator={registerPreSubmitValidator}
            authMode={authMode}
          />
        </Suspense>
      </EuiErrorBoundary>
    ) : null;

  return (
    <>
      <ConnectorFormFieldsGlobal canSave={canSave} isEdit={isEdit} />
      <EuiSpacer size="m" />
      {showSettingsSection ? (
        <>
          {showDualInbound ? (
            <InboundEventsFormSection
              canSave={canSave}
              wasLive={savedIsInboundEventsEnabled}
              settingsContent={settingsContent}
            />
          ) : null}
          {isDual && showInboundEvents && !outboundToggleAuthTypeId ? (
            <OutboundSectionTitle />
          ) : null}
          {showSettingsTitle ? (
            <>
              <EuiTitle size="xxs" data-test-subj="connector-settings-label">
                <h4>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorForm.connectorSettingsLabel"
                    defaultMessage="Connector settings"
                  />
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
            </>
          ) : null}
          {!isDual ? settingsContent : null}
          {outboundToggleAuthTypeId ? (
            <OutboundFormSection
              canSave={canSave}
              credentialedAuthTypeId={outboundToggleAuthTypeId}
            >
              {fieldsComponent}
            </OutboundFormSection>
          ) : (
            fieldsComponent
          )}
        </>
      ) : null}
    </>
  );
};

export const ConnectorFormFields = memo(ConnectorFormFieldsComponent);
