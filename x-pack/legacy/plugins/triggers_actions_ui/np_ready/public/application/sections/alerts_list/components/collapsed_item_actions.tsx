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
  disableAlert,
  enableAlert,
  muteAllAlertInstances,
  unmuteAllAlertInstances,
} from '../../../lib/api';

export interface ComponentOpts {
  item: AlertTableItem;
  onDeleted: () => void;
}

export const CollapsedItemActions: React.FunctionComponent<ComponentOpts> = ({
  item,
  onDeleted,
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
          onChange={() => {
            if (isEnabled) {
              disableAlert({ http, id: item.id });
              setIsEnabled(false);
              return;
            }
            enableAlert({ http, id: item.id });
            setIsEnabled(true);
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
          onChange={() => {
            if (isMuted) {
              unmuteAllAlertInstances({ http, id: item.id });
              setIsMuted(false);
              return;
            }
            muteAllAlertInstances({ http, id: item.id });
            setIsMuted(true);
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
              onDeleted();
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
