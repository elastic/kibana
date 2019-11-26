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
import { useAppDependencies } from '../../../index';
import {
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  muteAlerts,
  unmuteAlerts,
} from '../../../lib/api';

export interface ComponentOpts {
  item: AlertTableItem;
  onAlertChanged: () => void;
}

export const CollapsedItemActions: React.FunctionComponent<ComponentOpts> = ({
  item,
  onAlertChanged,
}: ComponentOpts) => {
  const {
    core: { http },
    plugins: { capabilities },
  } = useAppDependencies();

  const canDelete = capabilities.get().alerting.delete;
  const canSave = capabilities.get().alerting.save;

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
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={() => setIsPopoverOpen(false)}>
      <EuiFormRow>
        <EuiSwitch
          name="enable"
          disabled={!canSave}
          checked={isEnabled}
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
