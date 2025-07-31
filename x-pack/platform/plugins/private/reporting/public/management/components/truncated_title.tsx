/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

const LINE_CLAMP = 1;

const getTextCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

interface Props {
  text: string;
}

const TruncatedTitleComponent: React.FC<Props> = ({ text }) => {
  return (
    <span css={getTextCss} title={text}>
      {text}
    </span>
  );
};
TruncatedTitleComponent.displayName = 'TruncatedTitle';

export const TruncatedTitle = React.memo(TruncatedTitleComponent);
