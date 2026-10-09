/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { css as emotionCss } from '@emotion/react';

export const viewKiLoadingPanelCss = emotionCss`
  min-height: 400px;
`;

const kiFormattedDateSentenceStartFirstLetterClassName = css`
  &::first-letter {
    text-transform: uppercase;
  }
`;

export const KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME = `eui-displayInlineBlock ${kiFormattedDateSentenceStartFirstLetterClassName}`;

export const WRITER_URI_PATTERN = /^([^:]+):\/\/(.+)$/;

export const KI_WRITER_URI_SCHEME_WORKFLOW = 'workflow';
export const KI_WRITER_URI_SCHEME_TOOL = 'tool';
