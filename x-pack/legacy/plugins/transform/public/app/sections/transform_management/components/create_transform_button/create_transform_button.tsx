/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC, MouseEventHandler } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

interface CreateTransformButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export const CreateTransformButton: FC<CreateTransformButtonProps> = ({ onClick }) => {
  const { capabilities } = useContext(AuthorizationContext);

  const disabled =
    !capabilities.canCreateTransform ||
    !capabilities.canPreviewTransform ||
    !capabilities.canStartStopTransform;

  const createTransformButton = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={onClick}
      iconType="plusInCircle"
      data-test-subj="transformButtonCreate"
    >
      <FormattedMessage
        id="xpack.transform.transformList.createTransformButton"
        defaultMessage="Create a transform"
      />
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip position="top" content={createCapabilityFailureMessage('canCreateTransform')}>
        {createTransformButton}
      </EuiToolTip>
    );
  }

  return createTransformButton;
};
