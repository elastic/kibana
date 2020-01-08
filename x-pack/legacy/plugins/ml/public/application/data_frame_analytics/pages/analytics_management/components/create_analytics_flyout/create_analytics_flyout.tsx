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
    <EuiFlyout size="s" onClose={closeModal} data-test-subj="mlAnalyticsCreateJobFlyout">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="mlDataFrameAnalyticsFlyoutHeaderTitle">
            {i18n.translate('xpack.ml.dataframe.analytics.create.flyoutHeaderTitle', {
              defaultMessage: 'Create analytics job',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        {(!isJobCreated || !isJobStarted) && (
          <EuiButtonEmpty onClick={closeModal}>
            {isJobCreated === true
              ? i18n.translate('xpack.ml.dataframe.analytics.create.flyoutCloseButton', {
                  defaultMessage: 'Close',
                })
              : i18n.translate('xpack.ml.dataframe.analytics.create.flyoutCancelButton', {
                  defaultMessage: 'Cancel',
                })}
          </EuiButtonEmpty>
        )}

        {!isJobCreated && !isJobStarted && (
          <EuiButton
            className="mlAnalyticsCreateFlyout__footerButton"
            disabled={!isValid || isModalButtonDisabled}
            onClick={createAnalyticsJob}
            fill
            data-test-subj="mlAnalyticsCreateJobFlyoutCreateButton"
          >
            {i18n.translate('xpack.ml.dataframe.analytics.create.flyoutCreateButton', {
              defaultMessage: 'Create',
            })}
          </EuiButton>
        )}
        {isJobCreated && !isJobStarted && (
          <EuiButton
            className="mlAnalyticsCreateFlyout__footerButton"
            disabled={isModalButtonDisabled}
            onClick={startAnalyticsJob}
            fill
            data-test-subj="mlAnalyticsCreateJobFlyoutStartButton"
          >
            {i18n.translate('xpack.ml.dataframe.analytics.create.flyoutStartButton', {
              defaultMessage: 'Start',
            })}
          </EuiButton>
        )}
        {isJobCreated && isJobStarted && (
          <EuiButton
            onClick={closeModal}
            fill
            data-test-subj="mlAnalyticsCreateJobFlyoutCloseButton"
          >
            {i18n.translate('xpack.ml.dataframe.analytics.create.flyoutCloseButton', {
              defaultMessage: 'Close',
            })}
          </EuiButton>
        )}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
