/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { getIndexResultToolTip } from '../utils/get_index_result_tooltip';
import { getIndexResultBadgeColor } from './utils/get_index_result_badge_color';
import * as i18n from './translations';

const StyledBadge = styled(EuiBadge)`
  width: 44px;
  text-align: center;
  padding-inline: 0;

  .euiBadge__content {
    justify-content: center;
  }
`;

export type Props = React.ComponentProps<typeof EuiBadge> & {
  incompatible: number;
  tooltipText?: string;
};

export const IndexResultBadgeComponent: React.FC<Props> = ({
  incompatible,
  tooltipText,
  ...props
}) => {
  return (
    <EuiToolTip content={tooltipText ?? getIndexResultToolTip(incompatible)}>
      <StyledBadge
        data-test-subj="indexResultBadge"
        color={getIndexResultBadgeColor(incompatible)}
        {...props}
      >
        {incompatible > 0 ? i18n.FAIL : i18n.PASS}
      </StyledBadge>
    </EuiToolTip>
  );
};

IndexResultBadgeComponent.displayName = 'IndexCheckResultBadgeComponent';

export const IndexResultBadge = React.memo(IndexResultBadgeComponent);
