/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { memo } from 'react';
import { EuiButtonEmpty, EuiButtonEmptyProps } from '@elastic/eui';

const EuiButtonEmptyCss = css`
  border-top: ${euiThemeVars.euiBorderThin};
  border-radius: 0;
`;

interface ToggleAllButtonProps {
  'data-test-subj'?: string;
  color: EuiButtonEmptyProps['color'];
  icon: EuiButtonEmptyProps['iconType'];
  isDisabled: boolean;
  onClick: () => void;
  label: string;
}

export const ToggleAllButton = memo<ToggleAllButtonProps>(
  ({ color, 'data-test-subj': dataTestSubj, icon, isDisabled, label, onClick }) => {
    // const getTestId = useTestIdGenerator(dataTestSubj);
    return (
      <EuiButtonEmpty
        color={color}
        css={EuiButtonEmptyCss}
        data-test-subj={dataTestSubj}
        iconType={icon}
        isDisabled={isDisabled}
        onClick={onClick}
      >
        {label}
      </EuiButtonEmpty>
    );
  }
);

ToggleAllButton.displayName = 'ToggleAllButton';
