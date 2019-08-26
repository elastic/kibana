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

import { CreateAnalyticsAdvancedEditor } from '../create_analytics_advanced_editor';
import { CreateAnalyticsForm } from '../create_analytics_form';
import { CreateAnalyticsModal } from '../create_analytics_modal';

export const CreateAnalyticsButton: FC = () => {
  const createAnalyticsForm = useCreateAnalyticsForm();
  const { disabled, isAdvancedEditorEnabled, isModalVisible } = createAnalyticsForm.state;
  const { openModal } = createAnalyticsForm.actions;

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
        defaultMessage: 'Create outlier detection job',
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
        <CreateAnalyticsModal {...createAnalyticsForm}>
          {isAdvancedEditorEnabled === false && <CreateAnalyticsForm {...createAnalyticsForm} />}
          {isAdvancedEditorEnabled === true && (
            <CreateAnalyticsAdvancedEditor {...createAnalyticsForm} />
          )}
        </CreateAnalyticsModal>
      )}
    </Fragment>
  );
};
