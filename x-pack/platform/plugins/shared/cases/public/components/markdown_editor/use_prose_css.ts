/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, useEuiFontSize } from '@elastic/eui';

/**
 * Styles for user-authored markdown (case descriptions, comments).
 *
 * Markdown content is outside our control, so the two things that reliably break the page are
 * headings and measure:
 *
 * - A user's `#` renders at the app's own page-title scale, so their heading visually outranks the
 *   case title and the section chrome around it. Every heading level is capped below the app's
 *   hierarchy while keeping its semantic tag and its size *relative* to the other levels intact.
 * - Pasted machine output (JSON blobs, log lines) has no natural line breaks, so prose stretches to
 *   the full panel width. Text is capped to a readable measure; the cap is applied per text element
 *   rather than to the container so tables, code blocks, and images still get the full width.
 *
 * The `&&&` wrapper is load-bearing: EUI's own markdown styles are emitted after these and match at
 * the same specificity, so without it the caps below lose the tie on source order.
 */
export const useProseCss = () => {
  const { euiTheme } = useEuiTheme();
  const mFontSize = useEuiFontSize('m');
  const sFontSize = useEuiFontSize('s');

  return useMemo(
    () => css`
      &&& {
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          max-inline-size: 90ch;
          font-weight: ${euiTheme.font.weight.semiBold};
          margin-block: ${euiTheme.size.l} ${euiTheme.size.xs};

          &:first-child {
            margin-block-start: 0;
          }
        }

        h1 {
          font-size: ${mFontSize.fontSize};
          line-height: ${mFontSize.lineHeight};
        }

        h2,
        h3,
        h4,
        h5,
        h6 {
          font-size: ${sFontSize.fontSize};
          line-height: ${sFontSize.lineHeight};
        }

        h3,
        h4,
        h5,
        h6 {
          color: ${euiTheme.colors.textSubdued};
        }

        p,
        ul,
        ol,
        blockquote,
        pre,
        table {
          margin-block: 0 ${euiTheme.size.base};

          &:last-child {
            margin-block-end: 0;
          }
        }

        p,
        li,
        blockquote {
          max-inline-size: 90ch;
          overflow-wrap: anywhere;
        }

        li + li {
          margin-block-start: ${euiTheme.size.xxs};
        }

        /* Authors use rules as section breaks; at default weight a report full of them reads as a
           stack of boxes rather than as continuous prose. */
        hr {
          border: none;
          border-block-start: ${euiTheme.border.thin};
          margin-block: ${euiTheme.size.l};
        }

        code {
          font-size: 0.9em;
        }

        pre {
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          border-radius: ${euiTheme.border.radius.small};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }
      }
    `,
    [euiTheme, mFontSize, sFontSize]
  );
};
