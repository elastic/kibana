/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { createPermissionFailureMessage } from '../../../../../privilege/check_privilege';

import { useCreateAnalyticsForm } from '../../hooks/use_create_analytics_form';

import { CreateAnalyticsForm } from '../create_analytics_form';
import { CreateAnalyticsModal } from '../create_analytics_modal';

export const CreateAnalyticsButton: FC = () => {
  const { state, actions } = useCreateAnalyticsForm();
  const { disabled, isModalVisible } = state;
  const { openModal } = actions;

  const button = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={openModal}
      iconType="plusInCircle"
      size="s"
      data-test-subj="mlDataFrameAnalyticsButtonCreate"
    >
      {i18n.translate('xpack.ml.dataframe.analyticsList.createDataFrameAnalyticsButton', {
        defaultMessage: 'Create data frame analytics job',
      })}
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canCreateDataFrameAnalytics')}
      >
        {button}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {button}
      {isModalVisible && (
        <CreateAnalyticsModal actions={actions} formState={state}>
          <CreateAnalyticsForm actions={actions} formState={state} />
        </CreateAnalyticsModal>
      )}
    </Fragment>
  );
};
