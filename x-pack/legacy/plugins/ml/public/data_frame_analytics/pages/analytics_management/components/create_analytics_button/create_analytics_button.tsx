/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { moveToAnalyticsWizard } from '../../../../common';

export const CreateAnalyticsButton: FC = () => {
  const disabled =
    !checkPermission('canCreateDataFrame') ||
    !checkPermission('canPreviewDataFrame') ||
    !checkPermission('canStartStopDataFrame');

  const button = (
    <EuiButton
      disabled={true}
      fill
      onClick={moveToAnalyticsWizard}
      iconType="plusInCircle"
      size="s"
      data-test-subj="mlDataFrameAnalyticsButtonCreate"
    >
      <FormattedMessage
        id="xpack.ml.dataframe.analyticsList.createDataFrameAnalyticsButton"
        defaultMessage="Create data frame analytics job"
      />
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip position="top" content={createPermissionFailureMessage('canCreateDataFrame')}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
