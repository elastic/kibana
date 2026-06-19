/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

const TERMINAL_BG = '#0A1628';
const TERMINAL_CHROME = '#101C3F';
const TERMINAL_BORDER = '#1E3A6E';
const TERMINAL_TEXT = '#E2E8F0';
const TERMINAL_HEADING = '#FFFFFF';
const TERMINAL_PROMPT = '#48EFCF';
const TERMINAL_CODE = '#7DD3FC';
const TERMINAL_MUTED = '#A8B4C8';

const cursorBlink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

export const whyV2PageStyles = {
  page: ({ euiTheme }: UseEuiTheme) =>
    css`
      max-width: 1080px;
      margin: 0 auto;
      padding: ${euiTheme.size.xxxl} ${euiTheme.size.xl} ${euiTheme.size.xxxxl};
    `,
  sectionLabel: ({ euiTheme }: UseEuiTheme) =>
    css`
      font-size: ${euiTheme.font.scale.xs};
      font-weight: ${euiTheme.font.weight.semiBold};
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #a6adba;
      margin-bottom: ${euiTheme.size.s};
    `,
  highlightCard: ({ euiTheme }: UseEuiTheme) =>
    css`
      border-radius: ${euiTheme.border.radius.medium};
      padding: ${euiTheme.size.l};
      background: ${euiTheme.colors.backgroundBaseSubdued};
      height: 100%;
    `,
  spotlightSection: () =>
    css`
      padding-bottom: 0;
      padding-top: 0;

      & + & {
        padding-top: 0;
      }
    `,
  spotlightRow: () =>
    css`
      height: 240px;
    `,
  spotlightIllustration: ({ euiTheme }: UseEuiTheme) =>
    css`
      display: flex;
      align-items: center;
      justify-content: center;
      padding: ${euiTheme.size.l};
      max-width: 320px;
      margin: 0 auto;
    `,
  comparisonSection: () =>
    css`
      text-align: center;
    `,
  comparisonCard: ({ euiTheme }: UseEuiTheme) =>
    css`
      background: ${euiTheme.colors.emptyShade};
      border-radius: ${euiTheme.border.radius.medium};
      border: ${euiTheme.border.thin};
      overflow: hidden;
      overflow-x: auto;
    `,
  comparisonTable: ({ euiTheme }: UseEuiTheme) =>
    css`
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;

      th,
      td {
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        text-align: left;
        vertical-align: middle;
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
      }

      th p,
      td p {
        margin: 0;
      }

      tbody tr:last-of-type th,
      tbody tr:last-of-type td {
        border-bottom: none;
      }
    `,
  comparisonFeatureHeader: ({ euiTheme }: UseEuiTheme) =>
    css`
      width: 24%;
      border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
    `,
  comparisonV1Header: ({ euiTheme }: UseEuiTheme) =>
    css`
      width: 38%;
      font-size: ${euiTheme.font.scale.xs};
      font-weight: ${euiTheme.font.weight.semiBold};
      color: ${euiTheme.colors.textSubdued};
      border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
    `,
  comparisonV2Header: ({ euiTheme }: UseEuiTheme) =>
    css`
      width: 38%;
      font-size: ${euiTheme.font.scale.xs};
      font-weight: ${euiTheme.font.weight.semiBold};
      color: ${euiTheme.colors.text};
      background: ${euiTheme.colors.backgroundBaseSubdued};
      border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
      border-top-right-radius: ${euiTheme.border.radius.medium};
    `,
  comparisonFeatureCell:
    ({ euiTheme }: UseEuiTheme, isLastRow: boolean) =>
    css`
      font-size: ${euiTheme.font.scale.xs};
      font-weight: ${euiTheme.font.weight.semiBold};
      color: ${euiTheme.colors.textSubdued};
      ${isLastRow ? `border-bottom-left-radius: ${euiTheme.border.radius.medium};` : ''}
    `,
  comparisonV1Cell: () => css``,
  comparisonV2Cell:
    ({ euiTheme }: UseEuiTheme, isLastRow: boolean) =>
    css`
      background: ${euiTheme.colors.backgroundBaseSubdued};
      ${isLastRow ? `border-bottom-right-radius: ${euiTheme.border.radius.medium};` : ''}
    `,

  terminalWindow: ({ euiTheme }: UseEuiTheme) =>
    css`
      border-radius: ${euiTheme.border.radius.large};
      overflow: hidden;
      border: 1px solid ${TERMINAL_BORDER};
      box-shadow: 0 12px 40px rgba(16, 28, 63, 0.18);
      background: ${TERMINAL_BG};
    `,
  terminalChrome: ({ euiTheme }: UseEuiTheme) =>
    css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.m};
      padding: ${euiTheme.size.s} ${euiTheme.size.m};
      background: ${TERMINAL_CHROME};
      border-bottom: 1px solid ${TERMINAL_BORDER};
      font-family: ${euiTheme.font.familyCode};
      font-size: ${euiTheme.font.scale.xs};
    `,
  terminalTrafficLights: ({ euiTheme }: UseEuiTheme) =>
    css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      flex-shrink: 0;
    `,
  terminalDot: (color: string) => () =>
    css`
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${color};
      border: 1px solid rgba(0, 0, 0, 0.15);
    `,
  terminalTitle: () =>
    css`
      flex: 1;
      color: ${TERMINAL_TEXT};
      font-weight: 500;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
  terminalSourceBadge: () =>
    css`
      flex-shrink: 0;
      color: ${TERMINAL_MUTED};
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    `,
  terminalBody: ({ euiTheme }: UseEuiTheme) =>
    css`
      padding: ${euiTheme.size.l} ${euiTheme.size.xl} ${euiTheme.size.xl};
    `,
  terminalMarkdown: ({ euiTheme }: UseEuiTheme) =>
    css`
      font-family: ${euiTheme.font.familyCode};
      font-size: ${euiTheme.font.scale.xs};
      line-height: 1.55;

      .euiMarkdownFormat {
        color: ${TERMINAL_TEXT};
      }

      .euiMarkdownFormat h2,
      .euiMarkdownFormat h3,
      .euiMarkdownFormat h4,
      .euiMarkdownFormat p,
      .euiMarkdownFormat li,
      .euiMarkdownFormat strong {
        color: ${TERMINAL_TEXT};
      }

      .euiMarkdownFormat h2 {
        font-size: ${euiTheme.font.scale.s};
        font-weight: ${euiTheme.font.weight.semiBold};
        color: ${TERMINAL_HEADING};
        letter-spacing: -0.01em;
        margin-block: 0 ${euiTheme.size.s};

        &::before {
          content: '# ';
          color: ${TERMINAL_PROMPT};
          font-weight: ${euiTheme.font.weight.regular};
        }
      }

      .euiMarkdownFormat h3 {
        font-size: ${euiTheme.font.scale.xs};
        font-weight: ${euiTheme.font.weight.semiBold};
        color: ${TERMINAL_HEADING};
        margin-block: ${euiTheme.size.m} ${euiTheme.size.xs};

        &::before {
          content: '## ';
          color: ${TERMINAL_MUTED};
          font-weight: ${euiTheme.font.weight.regular};
        }
      }

      .euiMarkdownFormat p {
        margin-block: 0 ${euiTheme.size.s};
      }

      .euiMarkdownFormat strong {
        color: ${TERMINAL_HEADING};
        font-weight: ${euiTheme.font.weight.semiBold};
      }

      .euiMarkdownFormat code {
        color: ${TERMINAL_CODE};
        background: rgba(72, 239, 207, 0.14);
        padding: 0.1em 0.35em;
        border-radius: ${euiTheme.border.radius.small};
        font-size: 0.92em;
      }

      .euiMarkdownFormat ul {
        margin-block: 0 ${euiTheme.size.s};
        padding-inline-start: ${euiTheme.size.l};
      }

      .euiMarkdownFormat li {
        margin-block: ${euiTheme.size.xxs};

        &::marker {
          color: ${TERMINAL_PROMPT};
        }
      }

      .euiMarkdownFormat .euiHorizontalRule {
        background-color: ${TERMINAL_BORDER};
        color: ${TERMINAL_BORDER};
        margin-block: ${euiTheme.size.l};
      }

      .euiMarkdownFormat em {
        color: ${TERMINAL_MUTED};
        font-style: normal;

        &::before {
          content: '// ';
        }
      }
    `,
  terminalPrompt: ({ euiTheme }: UseEuiTheme) =>
    css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      margin-bottom: ${euiTheme.size.m};
      font-family: ${euiTheme.font.familyCode};
      font-size: ${euiTheme.font.scale.xs};
      color: ${TERMINAL_MUTED};
    `,
  terminalPromptSymbol: () =>
    css`
      color: ${TERMINAL_PROMPT};
      font-weight: 600;
    `,
  terminalPromptCommand: () =>
    css`
      color: ${TERMINAL_TEXT};
    `,
  terminalCursor: () =>
    css`
      display: inline-block;
      width: 8px;
      height: 1.1em;
      margin-left: 2px;
      background: ${TERMINAL_PROMPT};
      vertical-align: text-bottom;
      animation: ${cursorBlink} 1.1s step-end infinite;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
        opacity: 1;
      }
    `,
};
