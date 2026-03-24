/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';

const LINE_CLAMP = 3;

export const styles = {
  truncatedText: css`
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: ${LINE_CLAMP};
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  `,
};

interface TruncatedTextProps {
  text: string;
}

export const TruncatedText = React.memo<TruncatedTextProps>(({ text }) => {
  return <div css={styles.truncatedText}>{text}</div>;
});
TruncatedText.displayName = 'TruncatedText';
