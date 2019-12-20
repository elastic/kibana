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
import { useAppDependencies } from '../../../app_context';
import {
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  muteAlerts,
  unmuteAlerts,
} from '../../../lib/alert_api';

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
  const { http, toastNotifications } = useAppDependencies();

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
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
    const ids = selectedItems.filter(item => !isAlertMuted(item)).map(item => item.id);
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
      setIsMutingAlerts(false);
      onActionPerformed();
    }
  }

  async function onUnmuteAllClick() {
    onPerformingAction();
    setIsUnmutingAlerts(true);
    const ids = selectedItems.filter(isAlertMuted).map(item => item.id);
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
      setIsUnmutingAlerts(false);
      onActionPerformed();
    }
  }

  async function onEnableAllClick() {
    onPerformingAction();
    setIsEnablingAlerts(true);
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
      setIsEnablingAlerts(false);
      onActionPerformed();
    }
  }

  async function onDisableAllClick() {
    onPerformingAction();
    setIsDisablingAlerts(true);
    const ids = selectedItems.filter(item => !isAlertDisabled(item)).map(item => item.id);
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
      setIsDisablingAlerts(false);
      onActionPerformed();
    }
  }

  async function deleteSelectedItems() {
    onPerformingAction();
    setIsDeletingAlerts(true);
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
      setIsDeletingAlerts(false);
      onActionPerformed();
    }
  }

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      data-test-subj="bulkAction"
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
      {!allAlertsMuted && (
        <EuiFormRow>
          <EuiButtonEmpty
            onClick={onmMuteAllClick}
            isLoading={isMutingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="muteAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.muteAllTitle"
              defaultMessage="Mute all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      {allAlertsMuted && (
        <EuiFormRow>
          <EuiButtonEmpty
            onClick={onUnmuteAllClick}
            isLoading={isUnmutingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="unmuteAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.unmuteAllTitle"
              defaultMessage="Unmute all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      {allAlertsDisabled && (
        <EuiFormRow>
          <EuiButtonEmpty
            onClick={onEnableAllClick}
            isLoading={isEnablingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="enableAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.enableAllTitle"
              defaultMessage="Enable all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      {!allAlertsDisabled && (
        <EuiFormRow>
          <EuiButtonEmpty
            onClick={onDisableAllClick}
            isLoading={isDisablingAlerts}
            isDisabled={isPerformingAction}
            data-test-subj="disableAll"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.disableAllTitle"
              defaultMessage="Disable all"
            />
          </EuiButtonEmpty>
        </EuiFormRow>
      )}
      <EuiFormRow>
        <EuiButtonEmpty
          onClick={deleteSelectedItems}
          isLoading={isDeletingAlerts}
          isDisabled={isPerformingAction}
          data-test-subj="deleteAll"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.deleteAllTitle"
            defaultMessage="Delete all"
          />
        </EuiButtonEmpty>
      </EuiFormRow>
    </EuiPopover>
  );
};

function isAlertDisabled(alert: AlertTableItem) {
  return alert.enabled === false;
}

function isAlertMuted(alert: AlertTableItem) {
  return alert.muteAll === true;
}
