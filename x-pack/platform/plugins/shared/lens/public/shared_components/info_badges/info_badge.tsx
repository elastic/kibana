/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiColorPaletteDisplay,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export function InfoBadge({
  title,
  dataView,
  index,
  palette,
  children,
  'data-test-subj-prefix': dataTestSubjPrefix,
}: {
  title: string;
  dataView: string;
  index: number;
  palette?: string[];
  children?: React.ReactNode;
  'data-test-subj-prefix': string;
}) {
  const { euiTheme } = useEuiTheme();
  const hasColor = Boolean(palette);
  const hasSingleColor = palette && palette.length === 1;
  const hasMultipleColors = palette && palette.length > 1;
  const iconType = hasSingleColor ? 'stopFilled' : 'color';
  return (
    <li
      key={`${title}-${dataView}-${index}`}
      data-test-subj={`${dataTestSubjPrefix}-${index}`}
      css={css`
        margin: ${euiTheme.size.base} 0 0;
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {hasColor ? (
          <EuiFlexItem grow={false}>
            <EuiIcon
              color={hasSingleColor ? palette[0] : undefined}
              type={iconType}
              data-test-subj={`${dataTestSubjPrefix}-${index}-icon`}
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiText size="s" data-test-subj={`${dataTestSubjPrefix}-${index}-title`}>
            {title}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      </EuiFlexGroup>
      {hasMultipleColors ? (
        <div
          css={css`
            margin-top: ${euiTheme.size.xs};
            overflow-y: hidden;
            height: ${euiTheme.size.xs};
            margin-left: ${euiTheme.size.l};
          `}
        >
          <EuiColorPaletteDisplay
            size="xs"
            palette={palette}
            data-test-subj={`${dataTestSubjPrefix}-${index}-palette`}
          />
        </div>
      ) : null}
    </li>
  );
}
