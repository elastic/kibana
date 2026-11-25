/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  FIELD_TYPES,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

const runActionsLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.runActionsToggleSwitch',
  { defaultMessage: 'Run actions' }
);

const runActionsHelpText = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.runActionsHelpDescription',
  {
    defaultMessage:
      'Let rules, workflows and agents run actions with this connector. Turn off to only receive events, with no credentials.',
  }
);

const runActionsLastSwitchHelpText = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.runActionsLastSwitchHelpDescription',
  {
    defaultMessage: 'Turn on Receive events first. A connector needs at least one direction on.',
  }
);

interface OutboundActionsFormSectionProps {
  canSave: boolean;
  isEdit: boolean;
  /** Saved state has outbound on. Drives the credentials warning. */
  wasEnabled: boolean;
}

const OutboundActionsFormSectionComponent: React.FC<OutboundActionsFormSectionProps> = ({
  canSave,
  isEdit,
  wasEnabled,
}) => {
  const [{ isOutboundActionsEnabled, isInboundEventsEnabled }] = useFormData({
    watch: ['isOutboundActionsEnabled', 'isInboundEventsEnabled'],
  });
  const switchOn = isOutboundActionsEnabled !== false;
  // The last direction that is on cannot be turned off.
  const isLastSwitchOn = switchOn && isInboundEventsEnabled !== true;

  return (
    <>
      <UseField<boolean>
        path="isOutboundActionsEnabled"
        config={{ type: FIELD_TYPES.TOGGLE, defaultValue: true }}
      >
        {(field) => (
          <EuiFormRow
            fullWidth
            helpText={isLastSwitchOn ? runActionsLastSwitchHelpText : runActionsHelpText}
          >
            <EuiSwitch
              label={runActionsLabel}
              checked={field.value !== false}
              disabled={!canSave || isLastSwitchOn}
              onChange={(event) => field.setValue(event.target.checked)}
              data-test-subj="outbound-actions-enabled-switch"
            />
          </EuiFormRow>
        )}
      </UseField>
      {isEdit && wasEnabled && !switchOn ? (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            announceOnMount
            size="s"
            data-test-subj="outbound-actions-disable-warning"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.actionConnectorForm.outboundActionsDisableWarningTitle',
              { defaultMessage: 'Credentials will be removed' }
            )}
            text={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.outboundActionsDisableWarningDescription"
                defaultMessage="After save, the stored credentials are deleted. Rules, workflows and agents can no longer run actions with this connector. Turn Run actions on again and enter credentials to restore it."
              />
            }
          />
        </>
      ) : null}
    </>
  );
};

export const OutboundActionsFormSection = memo(OutboundActionsFormSectionComponent);
