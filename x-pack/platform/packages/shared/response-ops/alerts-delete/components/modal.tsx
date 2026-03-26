/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiForm,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCheckbox,
  EuiFormRow,
  EuiHorizontalRule,
  EuiFieldText,
  EuiPanel,
  EuiText,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { type AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import moment from 'moment';
import * as translations from '../translations';

import { ModalThresholdSelector as ThresholdSelector } from './modal_threshold_selector';
import {
  DEFAULT_THRESHOLD,
  DEFAULT_THRESHOLD_ENABLED,
  DEFAULT_THRESHOLD_UNIT,
  MAX_ALERT_DELETE_THRESHOLD_DAYS,
  MIN_ALERT_DELETE_THRESHOLD_DAYS,
  THRESHOLD_UNITS,
} from '../constants';
import { useAlertDeletePreview } from '../api/preview/use_alert_delete_preview';
import { useAlertDeleteSchedule } from '../api/schedule/use_alert_delete_schedule';
import { useAlertDeleteLastRun } from '../api/last_run/use_alert_delete_last_run';

const FORM_ID = 'alert-delete-settings';
const MODAL_ID = 'alert-delete-modal';

const getThresholdInDays = (threshold: number, thresholdUnit: EuiSelectOption) => {
  switch (thresholdUnit.value) {
    case 'days':
      return threshold;
    case 'months':
      return threshold * 30;
    case 'years':
      return threshold * 365;
    default:
      return 0;
  }
};

interface PreviewMessageProps {
  activeStateChecked: boolean;
  inactiveStateChecked: boolean;
  previewAffectedAlertsCount: number | undefined;
  isValidThreshold: boolean;
}
const PreviewMessage = ({
  activeStateChecked,
  inactiveStateChecked,
  previewAffectedAlertsCount,
  isValidThreshold,
}: PreviewMessageProps) => {
  if ((!activeStateChecked && !inactiveStateChecked) || previewAffectedAlertsCount === undefined) {
    return (
      <FormattedMessage
        id="responseOpsAlertDelete.previewInitial"
        defaultMessage="Select the type of alerts you wish to delete"
      />
    );
  }

  if (previewAffectedAlertsCount === 0) {
    return (
      <FormattedMessage
        id="responseOpsAlertDelete.previewEmpty"
        defaultMessage="No alerts match the selected criteria."
      />
    );
  }

  if (!isValidThreshold) {
    return (
      <FormattedMessage
        id="responseOpsAlertDelete.previewDisabled"
        defaultMessage="Affected alerts preview is disabled because the threshold is invalid."
      />
    );
  }

  return (
    <FormattedMessage
      id="responseOpsAlertDelete.preview"
      defaultMessage="This action will permanently delete a total of <strong>{count} {count, plural, one {alert} other {alerts}}</strong> and you won't be able to restore them."
      values={{
        strong: (chunks) => <strong>{chunks}</strong>,
        count: previewAffectedAlertsCount,
      }}
    />
  );
};

const getThresholdErrorMessages = (threshold: number, thresholdUnit: EuiSelectOption) => {
  const thresholdInDays = getThresholdInDays(threshold, thresholdUnit);
  const errorMessages = [];
  if (thresholdInDays < MIN_ALERT_DELETE_THRESHOLD_DAYS) {
    errorMessages.push(translations.THRESHOLD_ERROR_MIN);
  }
  if (thresholdInDays > MAX_ALERT_DELETE_THRESHOLD_DAYS) {
    errorMessages.push(translations.THRESHOLD_ERROR_MAX);
  }
  return errorMessages;
};

export interface AlertDeleteProps {
  services: { http: HttpStart; notifications: NotificationsStart };
  categoryIds: AlertDeleteCategoryIds[];
  onCloseModal: () => void;
  isVisible: boolean;
  isDisabled?: boolean;
}
export const AlertDeleteModal = ({
  services: { http, notifications },
  categoryIds,
  onCloseModal,
  isVisible,
  isDisabled = false,
}: AlertDeleteProps) => {
  const dateFormat = useUiSetting<string>('dateFormat');
  const [activeState, setActiveState] = useState({
    checked: DEFAULT_THRESHOLD_ENABLED,
    threshold: DEFAULT_THRESHOLD,
    thresholdUnit: DEFAULT_THRESHOLD_UNIT,
  });

  const [inactiveState, setInactiveState] = useState({
    checked: DEFAULT_THRESHOLD_ENABLED,
    threshold: DEFAULT_THRESHOLD,
    thresholdUnit: DEFAULT_THRESHOLD_UNIT,
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const errorMessages = {
    activeThreshold: getThresholdErrorMessages(activeState.threshold, activeState.thresholdUnit),
    inactiveThreshold: getThresholdErrorMessages(
      inactiveState.threshold,
      inactiveState.thresholdUnit
    ),
  };

  const validations = {
    isActiveThresholdValid: errorMessages.activeThreshold.length === 0,
    isInactiveThresholdValid: errorMessages.inactiveThreshold.length === 0,
    isDeleteConfirmationValid:
      deleteConfirmation === translations.DELETE_PASSKEY || deleteConfirmation.length === 0,
  };

  const isValidThreshold =
    validations.isActiveThresholdValid && validations.isInactiveThresholdValid;

  const { mutate: createAlertDeleteSchedule } = useAlertDeleteSchedule({
    services: { http },
    onSuccess: (message?: string) => {
      if (message) {
        notifications.toasts.addInfo(message);
      } else {
        notifications.toasts.addSuccess(translations.ALERT_DELETE_SUCCESS);
      }
      onClose();
    },
    onError: (error: IHttpFetchError<ResponseErrorBody>) => {
      notifications.toasts.addDanger({
        title: translations.ALERT_DELETE_FAILURE,
        text: error.body?.message || translations.UNKNOWN_ERROR,
      });
    },
  });

  const { data: { lastRun } = { lastRun: undefined }, isInitialLoading: isLoadingLastRun } =
    useAlertDeleteLastRun({
      services: { http },
      isEnabled: true,
      isOpen: isVisible,
    });

  const {
    data: { affectedAlertCount: previewAffectedAlertsCount } = { affectedAlertCount: undefined },
  } = useAlertDeletePreview({
    services: {
      http,
    },
    isEnabled: isValidThreshold,
    queryParams: {
      activeAlertDeleteThreshold: activeState.checked
        ? getThresholdInDays(activeState.threshold, activeState.thresholdUnit)
        : undefined,
      inactiveAlertDeleteThreshold: inactiveState.checked
        ? getThresholdInDays(inactiveState.threshold, inactiveState.thresholdUnit)
        : undefined,
      categoryIds,
    },
    lastRun,
  });

  const currentSettingsWouldDeleteAlerts =
    (activeState.checked || inactiveState.checked) &&
    previewAffectedAlertsCount &&
    previewAffectedAlertsCount > 0;

  const isFormValid =
    validations.isDeleteConfirmationValid &&
    validations.isActiveThresholdValid &&
    validations.isInactiveThresholdValid &&
    deleteConfirmation.length > 0 &&
    currentSettingsWouldDeleteAlerts;

  const activeAlertsCallbacks = {
    onChangeEnabled: (e: React.ChangeEvent<HTMLInputElement>) => {
      setActiveState((prev) => ({ ...prev, checked: e.target.checked }));
    },
    onChangeThreshold: (e: React.ChangeEvent<HTMLInputElement>) => {
      setActiveState((prev) => ({ ...prev, threshold: Number(e.target.value) }));
    },
    onChangeThresholdUnit: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = THRESHOLD_UNITS.find((option) => option.value === e.target.value);
      if (selectedValue) {
        setActiveState((prev) => ({ ...prev, thresholdUnit: selectedValue }));
      }
    },
  };

  const inactiveAlertsCallbacks = {
    onChangeEnabled: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInactiveState((prev) => ({ ...prev, checked: e.target.checked }));
    },
    onChangeThreshold: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInactiveState((prev) => ({ ...prev, threshold: Number(e.target.value) }));
    },
    onChangeThresholdUnit: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = THRESHOLD_UNITS.find((option) => option.value === e.target.value);
      if (selectedValue) {
        setInactiveState((prev) => ({ ...prev, thresholdUnit: selectedValue }));
      }
    },
  };

  const onChangeDeleteConfirmation = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeleteConfirmation(e.target.value);
  };

  const onScheduleCleanUpTask = (ev: React.FormEvent) => {
    ev.preventDefault();

    const bodyParams = {
      activeAlertDeleteThreshold:
        activeState.checked && validations.isActiveThresholdValid
          ? getThresholdInDays(activeState.threshold, activeState.thresholdUnit)
          : undefined,
      inactiveAlertDeleteThreshold:
        inactiveState.checked && validations.isInactiveThresholdValid
          ? getThresholdInDays(inactiveState.threshold, inactiveState.thresholdUnit)
          : undefined,
      categoryIds,
    };

    createAlertDeleteSchedule(bodyParams);
  };

  const onClose = () => {
    setActiveState({
      checked: DEFAULT_THRESHOLD_ENABLED,
      threshold: DEFAULT_THRESHOLD,
      thresholdUnit: DEFAULT_THRESHOLD_UNIT,
    });

    setInactiveState({
      checked: DEFAULT_THRESHOLD_ENABLED,
      threshold: DEFAULT_THRESHOLD,
      thresholdUnit: DEFAULT_THRESHOLD_UNIT,
    });

    setDeleteConfirmation('');

    onCloseModal();
  };

  if (!isVisible) {
    return <div data-test-subj="alert-delete-modal-loaded" />;
  }

  return (
    <EuiModal aria-labelledby={MODAL_ID} onClose={onClose} data-test-subj="alert-delete-modal">
      <EuiForm id={FORM_ID} component="form">
        <EuiModalHeader>
          <EuiModalHeaderTitle id={MODAL_ID}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>{translations.MODAL_TITLE}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {!isLoadingLastRun && lastRun && (
            <>
              <EuiText color="subdued" size="s" data-test-subj="alert-delete-last-run">
                {translations.ALERT_DELETE_LAST_RUN(lastRun && moment(lastRun).format(dateFormat))}
              </EuiText>
              <EuiSpacer size="l" />
            </>
          )}

          <p>
            {translations.MODAL_DESCRIPTION}&nbsp;
            <EuiIconTip
              color="subdued"
              size="s"
              type="info"
              content={translations.MODAL_DESCRIPTION_EXCEPTION}
            />
          </p>
          <EuiSpacer size="l" />

          <EuiPanel hasShadow={false} hasBorder color="subdued" id="alert-delete-active-panel">
            <EuiCheckbox
              id="alert-delete-active"
              data-test-subj="alert-delete-active-checkbox"
              checked={activeState.checked}
              disabled={isDisabled}
              onChange={activeAlertsCallbacks.onChangeEnabled}
              labelProps={{ css: 'width: 100%' }}
              label={
                <ThresholdSelector
                  title={translations.ACTIVE_ALERTS}
                  description={translations.ACTIVE_ALERTS_DESCRIPTION}
                  threshold={activeState.threshold}
                  thresholdUnit={activeState.thresholdUnit}
                  onChangeThreshold={activeAlertsCallbacks.onChangeThreshold}
                  onChangeThresholdUnit={activeAlertsCallbacks.onChangeThresholdUnit}
                  isInvalid={!validations.isActiveThresholdValid}
                  isDisabled={!activeState.checked || isDisabled}
                  isChecked={activeState.checked}
                  error={errorMessages.activeThreshold}
                  thresholdTestSubj="alert-delete-active-threshold"
                  thresholdUnitTestSubj="alert-delete-active-threshold-unit"
                />
              }
            />
          </EuiPanel>
          <EuiSpacer size="m" />

          <EuiPanel hasShadow={false} hasBorder color="subdued">
            <EuiCheckbox
              id="alert-delete-inactive"
              data-test-subj="alert-delete-inactive-checkbox"
              checked={inactiveState.checked}
              disabled={isDisabled}
              onChange={inactiveAlertsCallbacks.onChangeEnabled}
              labelProps={{ css: 'width: 100%' }}
              label={
                <ThresholdSelector
                  title={translations.INACTIVE_ALERTS}
                  description={translations.INACTIVE_ALERTS_DESCRIPTION}
                  threshold={inactiveState.threshold}
                  thresholdUnit={inactiveState.thresholdUnit}
                  onChangeThreshold={inactiveAlertsCallbacks.onChangeThreshold}
                  onChangeThresholdUnit={inactiveAlertsCallbacks.onChangeThresholdUnit}
                  isInvalid={!validations.isInactiveThresholdValid}
                  isDisabled={!inactiveState.checked || isDisabled}
                  isChecked={inactiveState.checked}
                  error={errorMessages.inactiveThreshold}
                  thresholdTestSubj="alert-delete-inactive-threshold"
                  thresholdUnitTestSubj="alert-delete-inactive-threshold-unit"
                />
              }
            />
          </EuiPanel>

          <EuiHorizontalRule />

          <p data-test-subj="alert-delete-preview-message">
            <PreviewMessage
              activeStateChecked={activeState.checked}
              inactiveStateChecked={inactiveState.checked}
              previewAffectedAlertsCount={previewAffectedAlertsCount}
              isValidThreshold={isValidThreshold}
            />
          </p>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={translations.DELETE_CONFIRMATION}
            fullWidth
            isInvalid={!validations.isDeleteConfirmationValid}
          >
            <EuiFieldText
              isInvalid={!validations.isDeleteConfirmationValid}
              value={deleteConfirmation}
              disabled={isDisabled || !currentSettingsWouldDeleteAlerts}
              onChange={onChangeDeleteConfirmation}
              data-test-subj="alert-delete-delete-confirmation"
              autoComplete="off"
            />
          </EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose} data-test-subj="alert-delete-modal-cancel">
            {translations.MODAL_CANCEL}
          </EuiButtonEmpty>
          <EuiButton
            type="submit"
            form={FORM_ID}
            fill
            color="danger"
            isDisabled={!isFormValid || isDisabled}
            data-test-subj="alert-delete-submit"
            onClick={onScheduleCleanUpTask}
          >
            {translations.MODAL_SUBMIT}
          </EuiButton>
        </EuiModalFooter>
      </EuiForm>
    </EuiModal>
  );
};

// Needed for lazy import
// eslint-disable-next-line import/no-default-export
export default AlertDeleteModal;
