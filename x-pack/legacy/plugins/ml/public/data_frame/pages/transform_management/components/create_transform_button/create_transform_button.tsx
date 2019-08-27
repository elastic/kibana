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

export const CreateTransformButton: SFC = () => {
  const disabled =
    !checkPermission('canCreateDataFrame') ||
    !checkPermission('canPreviewDataFrame') ||
    !checkPermission('canStartStopDataFrame');

  const button = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={moveToDataFrameWizard}
      iconType="plusInCircle"
      size="s"
      data-test-subj="mlDataFramesButtonCreate"
    >
      <FormattedMessage
        id="xpack.ml.dataframe.transformList.createDataFrameButton"
        defaultMessage="Create transform"
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
