/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';

export const CreateAnalyticsFlyout: FC<CreateAnalyticsFormProps> = ({
  actions,
  children,
  state,
}) => {
  const { closeModal, createAnalyticsJob, startAnalyticsJob } = actions;
  const { isJobCreated, isJobStarted, isModalButtonDisabled, isValid } = state;

  return (
    <EuiFlyout size="s" onClose={closeModal}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.ml.dataframe.analytics.create.modalHeaderTitle', {
              defaultMessage: 'Create analytics job',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        {(!isJobCreated || !isJobStarted) && (
          <EuiButtonEmpty onClick={closeModal}>
            {i18n.translate('xpack.ml.dataframe.analytics.create.modalCancelButton', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        )}

        {!isJobCreated && !isJobStarted && (
          <EuiButton disabled={!isValid || isModalButtonDisabled} onClick={createAnalyticsJob} fill>
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
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
