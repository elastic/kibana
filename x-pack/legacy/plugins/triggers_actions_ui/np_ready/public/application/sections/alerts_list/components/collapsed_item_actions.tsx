/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiSwitch,
} from '@elastic/eui';

import { AlertTableItem } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import { hasDeleteAlertsCapability, hasSaveAlertsCapability } from '../../../lib/capabilities';
import {
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  muteAlerts,
  unmuteAlerts,
} from '../../../lib/alert_api';

export interface ComponentOpts {
  item: AlertTableItem;
  onAlertChanged: () => void;
}

export const CollapsedItemActions: React.FunctionComponent<ComponentOpts> = ({
  item,
  onAlertChanged,
}: ComponentOpts) => {
  const {
    http,
    legacy: { capabilities },
  } = useAppDependencies();

  const canDelete = hasDeleteAlertsCapability(capabilities.get());
  const canSave = hasSaveAlertsCapability(capabilities.get());

  const [isEnabled, setIsEnabled] = useState<boolean>(item.enabled);
  const [isMuted, setIsMuted] = useState<boolean>(item.muteAll);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const button = (
    <EuiButtonIcon
      disabled={!canDelete && !canSave}
      iconType="boxesVertical"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.popoverButtonTitle',
        { defaultMessage: 'Actions' }
      )}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      data-test-subj="collapsedItemActions"
    >
      <EuiFormRow>
        <EuiSwitch
          name="enable"
          disabled={!canSave}
          checked={isEnabled}
          data-test-subj="enableSwitch"
          onChange={async () => {
            if (isEnabled) {
              setIsEnabled(false);
              await disableAlerts({ http, ids: [item.id] });
            } else {
              setIsEnabled(true);
              await enableAlerts({ http, ids: [item.id] });
            }
            onAlertChanged();
          }}
          label={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.enableTitle"
              defaultMessage="Enable"
            />
          }
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiSwitch
          name="mute"
          checked={isMuted}
          disabled={!canSave || !isEnabled}
          data-test-subj="muteSwitch"
          onChange={async () => {
            if (isMuted) {
              setIsMuted(false);
              await unmuteAlerts({ http, ids: [item.id] });
            } else {
              setIsMuted(true);
              await muteAlerts({ http, ids: [item.id] });
            }
            onAlertChanged();
          }}
          label={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.muteTitle"
              defaultMessage="Mute"
            />
          }
        />
      </EuiFormRow>
      <EuiPopoverFooter>
        <EuiFormRow>
          <EuiButtonEmpty
            isDisabled={!canDelete}
            iconType="trash"
            color="text"
            data-test-subj="deleteAlert"
            onClick={async () => {
              await deleteAlerts({ http, ids: [item.id] });
              onAlertChanged();
            }}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.collapsedItemActons.deleteTitle"
              defaultMessage="Delete"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
