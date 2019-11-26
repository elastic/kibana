/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiButtonEmpty, EuiFormRow, EuiPopover } from '@elastic/eui';

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
  selectedItems: AlertTableItem[];
  onPerformingAction: () => void;
  onActionPerformed: () => void;
}

export const BulkActionPopover: React.FunctionComponent<ComponentOpts> = ({
  selectedItems,
  onPerformingAction,
  onActionPerformed,
}: ComponentOpts) => {
  const {
    core: { http },
    plugins: { toastNotifications },
  } = useAppDependencies();

  const selectionContainsEnabledAlerts = selectedItems.some(isAlertEnabled);
  const selectionContainsDisabledAlerts = selectedItems.some(isAlertDisabled);
  const selectedContainsUnmutedAlerts = selectedItems.some(isAlertUnmuted);
  const selectionContainsMutedAlerts = selectedItems.some(isAlertOrInstancesMuted);

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  async function onmMuteAllClick() {
    setIsPopoverOpen(false);
    onPerformingAction();
    const ids = selectedItems.filter(isAlertUnmuted).map(item => item.id);
    try {
      await muteAlerts({ http, ids });
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToMuteAlertsMessage',
          {
            defaultMessage: 'Failed to mute alert(s)',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function onUnmuteAllClick() {
    setIsPopoverOpen(false);
    onPerformingAction();
    const ids = selectedItems.filter(isAlertOrInstancesMuted).map(item => item.id);
    try {
      await unmuteAlerts({ http, ids });
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToUnmuteAlertsMessage',
          {
            defaultMessage: 'Failed to unmute alert(s)',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function onEnableAllClick() {
    setIsPopoverOpen(false);
    onPerformingAction();
    const ids = selectedItems.filter(isAlertDisabled).map(item => item.id);
    try {
      await enableAlerts({ http, ids });
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToEnableAlertsMessage',
          {
            defaultMessage: 'Failed to enable alert(s)',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function onDisableAllClick() {
    setIsPopoverOpen(false);
    onPerformingAction();
    const ids = selectedItems.filter(isAlertEnabled).map(item => item.id);
    try {
      await disableAlerts({ http, ids });
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToDisableAlertsMessage',
          {
            defaultMessage: 'Failed to disable alert(s)',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  async function deleteSelectedItems() {
    setIsPopoverOpen(false);
    onPerformingAction();
    const ids = selectedItems.map(item => item.id);
    try {
      await deleteAlerts({ http, ids });
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.failedToDeleteAlertsMessage',
          {
            defaultMessage: 'Failed to delete alert(s)',
          }
        ),
      });
    } finally {
      onActionPerformed();
    }
  }

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.buttonTitle"
            defaultMessage="Bulk action"
          />
        </EuiButton>
      }
    >
      {selectedContainsUnmutedAlerts && (
        <EuiFormRow>
          <EuiButtonEmpty onClick={onmMuteAllClick}>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.muteAllTitle"
              defaultMessage="Mute all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      {selectionContainsMutedAlerts && (
        <EuiFormRow>
          <EuiButtonEmpty onClick={onUnmuteAllClick}>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.unmuteAllTitle"
              defaultMessage="Unmute all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      {selectionContainsDisabledAlerts && (
        <EuiFormRow>
          <EuiButtonEmpty onClick={onEnableAllClick}>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.enableAllTitle"
              defaultMessage="Enable all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      {selectionContainsEnabledAlerts && (
        <EuiFormRow>
          <EuiButtonEmpty onClick={onDisableAllClick}>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.disableAllTitle"
              defaultMessage="Disable all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      <EuiFormRow>
        <EuiButtonEmpty onClick={deleteSelectedItems}>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.deleteAllTitle"
            defaultMessage="Delete all"
          />
        </EuiButtonEmpty>
      </EuiFormRow>
    </EuiPopover>
  );
};

function isAlertEnabled(alert: AlertTableItem) {
  return alert.enabled === true;
}

function isAlertDisabled(alert: AlertTableItem) {
  return alert.enabled === false;
}

function isAlertUnmuted(alert: AlertTableItem) {
  return alert.muteAll === false;
}

function isAlertOrInstancesMuted(alert: AlertTableItem) {
  return alert.muteAll === true || alert.mutedInstanceIds.length > 0;
}
