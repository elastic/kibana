/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { getCopyAriaLabel } from './translations';

export interface CopyableDetailProps {
  label: string;
  value: string;
  onCopy: (value: string) => void;
  dataTestSubj?: string;
}

export const CopyableDetail: React.FC<CopyableDetailProps> = ({
  label,
  value,
  onCopy,
  dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const copyAriaLabel = getCopyAriaLabel(label);
  return (
    <div>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText
            size="s"
            css={{ fontFamily: euiTheme.font.familyCode, wordBreak: 'break-all' }}
            data-test-subj={dataTestSubj ? `${dataTestSubj}Value` : undefined}
          >
            {value}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={copyAriaLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="copy"
              color="text"
              aria-label={copyAriaLabel}
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                onCopy(value);
              }}
              data-test-subj={dataTestSubj}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
