/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStat, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { TITLE_SIZE } from '../constants';
import * as i18n from './translations';

interface Props {
  total: number;
  inline?: boolean;
}

const AvailableStatComponent: React.FC<Props> = ({ total, inline }) => {
  const tooltipContent = useMemo(() => i18n.AVAILABLE_TOOLTIP(total), [total]);

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiStat
        css={
          inline
            ? css`
                display: flex;
                align-items: center;
                gap: ${euiThemeVars.euiSizeXS};
              `
            : null
        }
        data-test-subj="availableStat"
        description={i18n.AVAILABLE}
        reverse
        title={total}
        titleSize={TITLE_SIZE}
      />
    </EuiToolTip>
  );
};

AvailableStatComponent.displayName = 'AvailableStatComponent';

export const AvailableStat = React.memo(AvailableStatComponent);
