/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { getEbtProps } from '@kbn/ebt-click';
import { css } from '@emotion/react';
import React from 'react';

interface ListKiSearchSubmitButtonProps {
  tooltip: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  'data-test-subj'?: string;
  ebtProps?: ReturnType<typeof getEbtProps>;
}

export const ListKiSearchSubmitButton = ({
  tooltip,
  disabled = false,
  isLoading = false,
  onClick,
  'data-test-subj': dataTestSubj,
  ebtProps,
}: ListKiSearchSubmitButtonProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem
      grow={false}
      css={css`
        padding-left: ${euiTheme.size.xs};
        flex-shrink: 0;
      `}
    >
      <EuiToolTip position="top" content={tooltip} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="return"
          display="fill"
          color="primary"
          size="s"
          disabled={disabled}
          isLoading={isLoading}
          aria-label={tooltip}
          onClick={onClick}
          data-test-subj={dataTestSubj}
          {...ebtProps}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
};
