/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiLink,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { useAppDependencies } from '../index';
import { documentationLinksService } from '../services/documentation';
import { CronEditor } from '../../shared_imports';
import { DEFAULT_RETENTION_SCHEDULE, DEFAULT_RETENTION_FREQUENCY } from '../constants';
import { updateRetentionSchedule } from '../services/http';

interface Props {
  children: (updateRetention: UpdateRetentionSettings) => React.ReactElement;
}

export type UpdateRetentionSettings = (
  retentionSchedule?: string,
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = () => void;

export const RetentionSettingsUpdateModalProvider: React.FunctionComponent<Props> = ({
  children,
}) => {
  const {
    core: {
      i18n,
      notification: { toastNotifications },
    },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  const [retentionSchedule, setRetentionSchedule] = useState<string>(DEFAULT_RETENTION_SCHEDULE);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const [isAdvancedCronVisible, setIsAdvancedCronVisible] = useState<boolean>(false);

  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: string;
  }>({
    expression: DEFAULT_RETENTION_SCHEDULE,
    frequency: DEFAULT_RETENTION_FREQUENCY,
  });

  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState<any>({});

  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  const updateRetentionPrompt: UpdateRetentionSettings = (
    originalRetentionSchedule,
    onSuccess = () => undefined
  ) => {
    setIsModalOpen(true);

    setIsAdvancedCronVisible(
      Boolean(originalRetentionSchedule && originalRetentionSchedule !== DEFAULT_RETENTION_SCHEDULE)
    );

    if (originalRetentionSchedule) {
      setIsEditing(true);
      setRetentionSchedule(originalRetentionSchedule);
    }

    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const updateRetentionSetting = async () => {
    if (!retentionSchedule) {
      setIsInvalid(true);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const { error } = await updateRetentionSchedule(retentionSchedule);

    setIsSaving(false);

    if (error) {
      setSaveError(error);
    } else {
      closeModal();

      toastNotifications.addSuccess(
        i18n.translate(
          'xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionSuccessMessage',
          {
            defaultMessage: 'Retention schedule updated',
          }
        )
      );

      if (onSuccessCallback.current) {
        onSuccessCallback.current();
      }
    }
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiModal onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {isEditing ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionEditTitle"
                  defaultMessage="Edit retention schedule"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionAddTitle"
                  defaultMessage="Add retention schedule"
                />
              )}
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            {saveError && (
              <Fragment>
                <EuiCallOut
                  title={
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionErrorTitle"
                      defaultMessage="Error saving retention schedule"
                    />
                  }
                  color="danger"
                  iconType="alert"
                >
                  {saveError.data && saveError.data.message ? (
                    <p>{saveError.data.message}</p>
                  ) : null}
                </EuiCallOut>
                <EuiSpacer size="m" />
              </Fragment>
            )}
            {isAdvancedCronVisible ? (
              <Fragment>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionScheduleLabel"
                      defaultMessage="Retention schedule"
                    />
                  }
                  isInvalid={isInvalid}
                  error={i18n.translate(
                    'xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionScheduleFieldErrorMessage',
                    {
                      defaultMessage: 'Retention schedule is required.',
                    }
                  )}
                  helpText={
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionHelpText"
                      defaultMessage="Use cron expression. {docLink}"
                      values={{
                        docLink: (
                          <EuiLink href={documentationLinksService.getCronUrl()} target="_blank">
                            <FormattedMessage
                              id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionHelpTextDocLinkText"
                              defaultMessage="Learn more."
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  }
                  fullWidth
                >
                  <EuiFieldText
                    defaultValue={retentionSchedule}
                    fullWidth
                    onChange={e => setRetentionSchedule(e.target.value)}
                  />
                </EuiFormRow>

                <EuiSpacer size="m" />

                <EuiText size="s">
                  <EuiLink
                    onClick={() => {
                      setIsAdvancedCronVisible(false);
                      setRetentionSchedule(simpleCron.expression);
                    }}
                    data-test-subj="showBasicCronLink"
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionBasicLabel"
                      defaultMessage="Create basic interval"
                    />
                  </EuiLink>
                </EuiText>
              </Fragment>
            ) : (
              <Fragment>
                <CronEditor
                  fieldToPreferredValueMap={fieldToPreferredValueMap}
                  cronExpression={simpleCron.expression}
                  frequency={simpleCron.frequency}
                  onChange={({
                    cronExpression: expression,
                    frequency,
                    fieldToPreferredValueMap: newFieldToPreferredValueMap,
                  }: {
                    cronExpression: string;
                    frequency: string;
                    fieldToPreferredValueMap: any;
                  }) => {
                    setSimpleCron({
                      expression,
                      frequency,
                    });
                    setFieldToPreferredValueMap(newFieldToPreferredValueMap);
                    setRetentionSchedule(expression);
                  }}
                />

                <EuiSpacer size="m" />

                <EuiText size="s">
                  <EuiLink
                    onClick={() => {
                      setIsAdvancedCronVisible(true);
                    }}
                    data-test-subj="showAdvancedCronLink"
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionAdvancedLabel"
                      defaultMessage="Create cron expression"
                    />
                  </EuiLink>
                </EuiText>
              </Fragment>
            )}
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionCancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton onClick={updateRetentionSetting} fill isLoading={isSaving}>
              {isEditing ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionEditButtonLabel"
                  defaultMessage="Save changes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepRetention.policyUpdateRetentionSaveButtonLabel"
                  defaultMessage="Schedule"
                />
              )}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(updateRetentionPrompt)}
      {renderModal()}
    </Fragment>
  );
};
