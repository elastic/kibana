/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const getListItemStyle = ({ border, colors, size }: EuiThemeComputed<{}>) => ({
  dotted: css`
    border-bottom-style: dashed;
  `,
  field: css`
    border-bottom: ${border.thin};
    height: calc(${size.xl} * 2);
    margin-top: ${size.xs};
  `,
  fieldEnabled: css`
    &:hover {
      background-color: ${colors.backgroundBaseHighlighted};
    }
  `,
  fieldHighlighted: css`
    background-color: ${colors.backgroundBaseHighlighted};
  `,
  fieldDim: css`
    opacity: 0.3;
    &:hover {
      background-color: initial;
    }
  `,
  wrapper: css`
    padding-left: ${size.xs};
  `,
  wrapperIndent: css`
    padding-left: ${size.m};
  `,
  content: css`
    height: calc(${size.xl} * 2);
    position: relative;
  `,
  contentIndent: css`
    padding-left: ${size.base};
  `,
  toggle: css`
    padding-left: ${size.xs};
    width: ${size.l};
  `,
  actions: css`
    padding-left: ${size.s};
  `,
});
