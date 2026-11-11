/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface RefreshTransformListButton {
  isLoading: boolean;
  onClick(): void;
}
export const RefreshTransformListButton: FC<RefreshTransformListButton> = ({
  onClick,
  isLoading,
}) => {
  const { euiTheme } = useEuiTheme();
  const label = i18n.translate('xpack.transform.transformList.refreshButtonLabel', {
    defaultMessage: 'Refresh transforms',
  });

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={label}
        color="primary"
        data-test-subj={`transformRefreshTransformListButton${isLoading ? ' loading' : ' loaded'}`}
        display="base"
        iconType="refresh"
        isLoading={isLoading}
        onClick={onClick}
        size="s"
        css={{
          blockSize: euiTheme.size.xl,
          inlineSize: euiTheme.size.xl,
        }}
      />
    </EuiToolTip>
  );
};
