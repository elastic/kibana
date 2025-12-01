/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { Phase } from '../../../../../common/types';
import { usePhaseColors } from '../../../lib';

export const PhaseIndicator = ({ phase }: { phase: Phase }) => {
  const phaseToIndicatorColors = usePhaseColors();

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
