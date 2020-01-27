/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty } from '@elastic/eui';

import { AlertTableItem } from '../../../../types';
import { useAppDependencies } from '../../../app_context';

export interface ComponentOpts {
  selectedItems: AlertTableItem[];
  onPerformingAction: () => void;
  onActionPerformed: () => void;
  onMuteAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onUnmuteAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onEnableAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onDisableAlerts: (alerts: AlertTableItem[]) => Promise<void>;
  onDeleteAlerts: (alerts: AlertTableItem[]) => Promise<void>;
}

export const AlertQuickEditButtons: React.FunctionComponent<ComponentOpts> = ({
  selectedItems,
  onPerformingAction,
  onActionPerformed,
  onMuteAlerts,
  onUnmuteAlerts,
  onEnableAlerts,
  onDisableAlerts,
  onDeleteAlerts,
}: ComponentOpts) => {
  const { toastNotifications } = useAppDependencies();

  const [isMutingAlerts, setIsMutingAlerts] = useState<boolean>(false);
  const [isUnmutingAlerts, setIsUnmutingAlerts] = useState<boolean>(false);
  const [isEnablingAlerts, setIsEnablingAlerts] = useState<boolean>(false);
  const [isDisablingAlerts, setIsDisablingAlerts] = useState<boolean>(false);
  const [isDeletingAlerts, setIsDeletingAlerts] = useState<boolean>(false);

  const allAlertsMuted = selectedItems.every(isAlertMuted);
  const allAlertsDisabled = selectedItems.every(isAlertDisabled);
  const isPerformingAction =
    isMutingAlerts || isUnmutingAlerts || isEnablingAlerts || isDisablingAlerts || isDeletingAlerts;

  async function onmMuteAllClick() {
    onPerformingAction();
    setIsMutingAlerts(true);
    try {
      await onMuteAlerts(selectedItems);
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
      setIsMutingAlerts(false);
      onActionPerformed();
    }
  }

  async function onUnmuteAllClick() {
    onPerformingAction();
    setIsUnmutingAlerts(true);
    try {
      await onUnmuteAlerts(selectedItems);
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
      setIsUnmutingAlerts(false);
      onActionPerformed();
    }
  }

  async function onEnableAllClick() {
    onPerformingAction();
    setIsEnablingAlerts(true);
    try {
      await onEnableAlerts(selectedItems);
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
      setIsEnablingAlerts(false);
      onActionPerformed();
    }
  }

  async function onDisableAllClick() {
    onPerformingAction();
    setIsDisablingAlerts(true);
    try {
      await onDisableAlerts(selectedItems.filter(item => !isAlertDisabled(item)));
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
      setIsDisablingAlerts(false);
      onActionPerformed();
    }
  }

  async function deleteSelectedItems() {
    onPerformingAction();
    setIsDeletingAlerts(true);
    try {
      await onDeleteAlerts(selectedItems);
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
      setIsDeletingAlerts(false);
      onActionPerformed();
    }
  }

  return (
    <Fragment>
      {!allAlertsMuted && (
        <EuiButtonEmpty
          onClick={onmMuteAllClick}
          isLoading={isMutingAlerts}
          isDisabled={isPerformingAction}
          data-test-subj="muteAll"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.muteAllTitle"
            defaultMessage="Mute"
          />
        </EuiButtonEmpty>
      )}
      {allAlertsMuted && (
        <EuiButtonEmpty
          onClick={onUnmuteAllClick}
          isLoading={isUnmutingAlerts}
          isDisabled={isPerformingAction}
          data-test-subj="unmuteAll"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.unmuteAllTitle"
            defaultMessage="Unmute"
          />
        </EuiButtonEmpty>
      )}
      {allAlertsDisabled && (
        <EuiButtonEmpty
          onClick={onEnableAllClick}
          isLoading={isEnablingAlerts}
          isDisabled={isPerformingAction}
          data-test-subj="enableAll"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.enableAllTitle"
            defaultMessage="Enable"
          />
        </EuiButtonEmpty>
      )}
      {!allAlertsDisabled && (
        <EuiButtonEmpty
          onClick={onDisableAllClick}
          isLoading={isDisablingAlerts}
          isDisabled={isPerformingAction}
          data-test-subj="disableAll"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.disableAllTitle"
            defaultMessage="Disable"
          />
        </EuiButtonEmpty>
      )}

      <EuiButtonEmpty
        onClick={deleteSelectedItems}
        isLoading={isDeletingAlerts}
        isDisabled={isPerformingAction}
        data-test-subj="deleteAll"
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.deleteAllTitle"
          defaultMessage="Delete"
        />
      </EuiButtonEmpty>
    </Fragment>
  );
};

function isAlertDisabled(alert: AlertTableItem) {
  return alert.enabled === false;
}

function isAlertMuted(alert: AlertTableItem) {
  return alert.muteAll === true;
}
