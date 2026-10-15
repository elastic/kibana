/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import {
  EuiCallOut,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  FIELD_TYPES,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

const inboundTitle = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.actionConnectorForm.inboundTitle"
    defaultMessage="Inbound"
  />
);

const outboundTitle = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.actionConnectorForm.outboundTitle"
    defaultMessage="Outbound"
  />
);

const receiveEventsLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.receiveEventsToggleSwitch',
  { defaultMessage: 'Receive events' }
);

interface ConnectorFormSectionTitleProps {
  children: ReactNode;
  'data-test-subj': string;
}

export const ConnectorFormSectionTitle: React.FC<ConnectorFormSectionTitleProps> = ({
  children,
  'data-test-subj': dataTestSubj,
}) => (
  <>
    <EuiHorizontalRule margin="m" />
    <EuiTitle size="xxs" data-test-subj={dataTestSubj}>
      <h4>{children}</h4>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);

export const InboundSectionTitle: React.FC = () => (
  <ConnectorFormSectionTitle data-test-subj="connector-inbound-label">
    {inboundTitle}
  </ConnectorFormSectionTitle>
);

export const OutboundSectionTitle: React.FC = () => (
  <ConnectorFormSectionTitle data-test-subj="connector-outbound-label">
    {outboundTitle}
  </ConnectorFormSectionTitle>
);

interface InboundEventsFormSectionProps {
  canSave: boolean;
  wasLive: boolean;
  settingsContent?: ReactNode;
}

const InboundEventsFormSectionComponent: React.FC<InboundEventsFormSectionProps> = ({
  canSave,
  wasLive,
  settingsContent,
}) => {
  const [{ isInboundEventsEnabled }] = useFormData({ watch: ['isInboundEventsEnabled'] });
  const switchOn = isInboundEventsEnabled === true;

  return (
    <>
      <InboundSectionTitle />
      <UseField<boolean>
        path="isInboundEventsEnabled"
        config={{ type: FIELD_TYPES.TOGGLE, defaultValue: false }}
      >
        {(field) => (
          <EuiFormRow
            fullWidth
            helpText={i18n.translate(
              'xpack.triggersActionsUI.sections.actionConnectorForm.receiveEventsHelpDescription',
              {
                defaultMessage:
                  'Accept webhooks on a Kibana URL. Uses an ingest token, not this connector’s outbound keys.',
              }
            )}
          >
            <EuiSwitch
              label={receiveEventsLabel}
              checked={field.value === true}
              disabled={!canSave}
              onChange={(event) => field.setValue(event.target.checked)}
              data-test-subj="inbound-events-enabled-switch"
            />
          </EuiFormRow>
        )}
      </UseField>
      {switchOn && settingsContent != null ? (
        <>
          <EuiSpacer size="s" />
          {settingsContent}
        </>
      ) : null}
      {!switchOn && wasLive ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="warning"
            data-test-subj="inbound-events-disable-warning"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.actionConnectorForm.inboundEventsDisableWarningTitle',
              { defaultMessage: 'Inbound events will stop' }
            )}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.actionConnectorForm.inboundEventsDisableWarningDescription"
              defaultMessage="After save, the webhook URL stops working immediately. Workflows bound to this connector stop getting events. Outbound actions are unchanged."
            />
          </EuiCallOut>
        </>
      ) : null}
    </>
  );
};

export const InboundEventsFormSection = memo(InboundEventsFormSectionComponent);
