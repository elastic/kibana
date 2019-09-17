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
} from '../../../../../../../ml/public/privilege/check_privilege';

import { moveToTransformWizard } from '../../../../common';

export const CreateTransformButton: SFC = () => {
  const disabled =
    !checkPermission('canCreateTransform') ||
    !checkPermission('canPreviewTransform') ||
    !checkPermission('canStartStopTransform');

  const button = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={moveToTransformWizard}
      iconType="plusInCircle"
      size="s"
      data-test-subj="transformButtonCreate"
    >
      <FormattedMessage
        id="xpack.transform.transformList.createTransformButton"
        defaultMessage="Create transform"
      />
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip position="top" content={createPermissionFailureMessage('canCreateTransform')}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
