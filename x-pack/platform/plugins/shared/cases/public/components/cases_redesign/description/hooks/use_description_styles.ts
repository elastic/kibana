/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, useEuiFontSize } from '@elastic/eui';

export const useDescriptionStyles = () => {
  const { euiTheme } = useEuiTheme();
  const sFontSize = useEuiFontSize('s');

  return useMemo(
    () => ({
      title: css`
        font-weight: ${euiTheme.font.weight.medium};
        font-size: ${sFontSize.fontSize};
        line-height: ${sFontSize.lineHeight};
        letter-spacing: 0;
      `,
      preview: css`
        color: ${euiTheme.colors.textSubdued};
        font-weight: ${euiTheme.font.weight.regular};
        font-size: ${sFontSize.fontSize};
        line-height: ${sFontSize.lineHeight};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
        max-width: 40vw;
      `,
      header: css`
        padding: ${euiTheme.size.s};
        align-items: center;
        min-height: ${euiTheme.size.xxl};
      `,
      editIcon: css`
        .euiButtonIcon__icon {
          color: ${euiTheme.colors.textSubdued};
        }
      `,
      content: css`
        background: ${euiTheme.colors.backgroundBaseSubdued};
        border-radius: ${euiTheme.size.xs};
        padding: ${euiTheme.size.s};

        > div {
          padding: 0;
        }
      `,
      unsavedDraft: css`
        border-top: ${euiTheme.border.thin};
        padding: ${euiTheme.size.s};
      `,
    }),
    [euiTheme, sFontSize]
  );
};
