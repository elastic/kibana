/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { Phase } from '../../../../../common/types';

export const PhaseIndicator = ({ phase }: { phase: Phase }) => {
  const { euiTheme } = useEuiTheme();

  // Changing the mappings for the phases in Borealis as a mid-term solution. See https://github.com/elastic/kibana/issues/203664#issuecomment-2536593361.
  const phaseToIndicatorColors = {
    hot: euiTheme.colors.vis.euiColorVis6,
    warm: euiTheme.colors.vis.euiColorVis9,
    cold: euiTheme.colors.vis.euiColorVis2,
    frozen: euiTheme.colors.vis.euiColorVis4,
    delete: euiTheme.colors.lightShade,
  };

  return (
    <div
      css={css`
        width: 16px;
        height: 8px;
        display: inline-block;
        border-radius: 4px;
        background-color: ${phaseToIndicatorColors[phase]};
      `}
    />
  );
};
