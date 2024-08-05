/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStat, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';

import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { TITLE_SIZE } from '../constants';
import * as i18n from './translations';

interface Props {
  allowed: number;
  titleSize?: 'xs' | 's' | 'xxxs' | 'xxs' | 'm' | 'l' | undefined;
  gap?: string;
  total: number;
  inline?: boolean;
}

const AllowedStatComponent: React.FC<Props> = ({
  allowed,
  total,
  inline,
  titleSize = TITLE_SIZE,
  gap = euiThemeVars.euiSizeXS,
}) => {
  const tooltipContent = useMemo(() => i18n.ALLOWED_TOOLTIP({ allowed, total }), [allowed, total]);

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiStat
        css={
          inline
            ? css`
                display: flex;
                align-items: center;
                gap: ${gap};
              `
            : null
        }
        data-test-subj="allowedStat"
        description={i18n.ALLOWED}
        reverse
        title={allowed}
        titleSize={titleSize}
      />
    </EuiToolTip>
  );
};

AllowedStatComponent.displayName = 'AllowedStatComponent';

export const AllowedStat = React.memo(AllowedStatComponent);
