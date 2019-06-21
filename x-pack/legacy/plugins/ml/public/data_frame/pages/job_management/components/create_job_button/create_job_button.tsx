/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { moveToDataFrameWizard } from '../../../../common';

export const CreateJobButton: SFC = () => {
  const disabled =
    !checkPermission('canCreateDataFrameJob') ||
    !checkPermission('canPreviewDataFrameJob') ||
    !checkPermission('canStartStopDataFrameJob');

  const button = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={moveToDataFrameWizard}
      iconType="plusInCircle"
      size="s"
    >
      <FormattedMessage
        id="xpack.ml.dataframe.jobsList.createDataFrameButton"
        defaultMessage="Create data frame"
      />
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip position="top" content={createPermissionFailureMessage('canCreateDataFrameJob')}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
