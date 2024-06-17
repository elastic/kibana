/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStat, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { getColor, getTooltipContent } from './helpers';
import { TITLE_SIZE } from '../constants';
import * as i18n from './translations';

interface Props {
  anonymized: number;
  titleSize?: 'xs' | 's' | 'xxxs' | 'xxs' | 'm' | 'l' | undefined;
  gap?: string;
  isDataAnonymizable: boolean;
  inline?: boolean;
}

const AnonymizedStatComponent: React.FC<Props> = ({
  anonymized,
  isDataAnonymizable,
  inline,
  titleSize = TITLE_SIZE,
  gap = euiThemeVars.euiSizeXS,
}) => {
  const color = useMemo(() => getColor(isDataAnonymizable), [isDataAnonymizable]);

  const tooltipContent = useMemo(
    () => getTooltipContent({ anonymized, isDataAnonymizable }),
    [anonymized, isDataAnonymizable]
  );

  const description = useMemo(
    () => (
      <EuiText color={color} data-test-subj="description" size="s">
        {i18n.ANONYMIZED_FIELDS}
      </EuiText>
    ),
    [color]
  );

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
        data-test-subj="anonymizedFieldsStat"
        description={description}
        reverse
        titleColor={color}
        title={anonymized}
        titleSize={titleSize}
      />
    </EuiToolTip>
  );
};

AnonymizedStatComponent.displayName = 'AnonymizedStatComponent';

export const AnonymizedStat = React.memo(AnonymizedStatComponent);
