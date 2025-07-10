/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';

interface Props {
  isDisabled: boolean;
  navigateToSourceSelection: () => void;
  size?: EuiButtonProps['size'];
}

export const CreateAnalyticsButton: FC<Props> = ({
  isDisabled,
  navigateToSourceSelection,
  size = 's',
}) => {
  const button = (
    <EuiButton
      disabled={isDisabled}
      fill
      onClick={navigateToSourceSelection}
      iconType="plusInCircle"
      size={size}
      data-test-subj="mlAnalyticsButtonCreate"
    >
      {i18n.translate('xpack.ml.dataframe.analyticsList.createDataFrameAnalyticsButton', {
        defaultMessage: 'Create job',
      })}
    </EuiButton>
  );

  if (isDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canCreateDataFrameAnalytics')}
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
