/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiLoadingSpinner, isColorDark, useEuiTheme } from '@elastic/eui';
import { hexToRgb } from '../../../common/lib/hex_to_rgb';

interface Props {
  animated?: boolean;
  backgroundColor?: string;
  text?: string;
}

export const Loading: FC<Props> = ({
  animated = false,
  text = '',
  backgroundColor = '#000000',
}) => {
  const { euiTheme } = useEuiTheme();
  const loadingStyles = useMemo(() => css({ color: euiTheme.colors.lightShade }), [euiTheme]);

  if (animated) {
    return (
      <div className="canvasLoading" css={loadingStyles}>
        {text && (
          <span>
            {text}
            &nbsp;
          </span>
        )}
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  const rgb = hexToRgb(backgroundColor);
  let color = 'text';

  if (rgb && isColorDark(rgb[0], rgb[1], rgb[2])) {
    color = 'ghost';
  }

  return (
    <div className="canvasLoading" css={loadingStyles}>
      {text && (
        <span>
          {text}
          &nbsp;
        </span>
      )}
      <EuiIcon color={color} type="clock" aria-hidden={true} />
    </div>
  );
};
