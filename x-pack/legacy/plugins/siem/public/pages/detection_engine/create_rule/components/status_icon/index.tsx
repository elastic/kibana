/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiIcon } from '@elastic/eui';
import React, { memo } from 'react';
import styled from 'styled-components';

import { useEuiTheme } from '../../../../../lib/theme/use_eui_theme';
import { RuleStatusType } from '../../types';

export interface RuleStatusIconProps {
  name: string;
  type: RuleStatusType;
}

const RuleStatusIconStyled = styled.div`
  position: relative;
  svg {
    position: absolute;
    top: 8px;
    left: 9px;
  }
`;

export const RuleStatusIcon = memo<RuleStatusIconProps>(({ name, type }) => {
  const theme = useEuiTheme();
  const color = type === 'passive' ? theme.euiColorLightestShade : theme.euiColorDarkestShade;
  return (
    <RuleStatusIconStyled>
      <EuiAvatar color={color} name={type === 'valid' ? '' : name} size="l" />
      {type === 'valid' ? <EuiIcon type="check" color={theme.euiColorEmptyShade} size="l" /> : null}
    </RuleStatusIconStyled>
  );
});
