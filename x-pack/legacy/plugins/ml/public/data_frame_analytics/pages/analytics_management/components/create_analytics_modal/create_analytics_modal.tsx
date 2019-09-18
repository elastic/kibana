/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';

export const CreateAnalyticsModal: FC<CreateAnalyticsFormProps> = ({
  actions,
  children,
  state,
}) => {
  const { closeModal, createAnalyticsJob, startAnalyticsJob } = actions;
  const {
    isAdvancedEditorEnabled,
    isJobCreated,
    isJobStarted,
    isModalButtonDisabled,
    isValid,
  } = state;

  const width = isAdvancedEditorEnabled ? '640px' : '450px';

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal} style={{ width }}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.ml.dataframe.analytics.create.modalHeaderTitle', {
              defaultMessage: 'Create analytics job',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{children}</EuiModalBody>

        <EuiModalFooter>
          {(!isJobCreated || !isJobStarted) && (
            <EuiButtonEmpty onClick={closeModal}>
              {i18n.translate('xpack.ml.dataframe.analytics.create.modalCancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          )}

          {!isJobCreated && !isJobStarted && (
            <EuiButton
              disabled={!isValid || isModalButtonDisabled}
              onClick={createAnalyticsJob}
              fill
            >
              {i18n.translate('xpack.ml.dataframe.analytics.create.modalCreateButton', {
                defaultMessage: 'Create',
              })}
            </EuiButton>
          )}
          {isJobCreated && !isJobStarted && (
            <EuiButton disabled={isModalButtonDisabled} onClick={startAnalyticsJob} fill>
              {i18n.translate('xpack.ml.dataframe.analytics.create.modalStartButton', {
                defaultMessage: 'Start',
              })}
            </EuiButton>
          )}
          {isJobCreated && isJobStarted && (
            <EuiButton onClick={closeModal} fill>
              {i18n.translate('xpack.ml.dataframe.analytics.create.modalCloseButton', {
                defaultMessage: 'Close',
              })}
            </EuiButton>
          )}
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
