/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

const maxConversationWidthStyles = css`
  max-width: 800px;
`;

// Ensures the conversation element is always 100% of it's parent or 800px, whichever is smaller.
export const conversationElementWidthStyles = css`
  width: 100%;
  ${maxConversationWidthStyles}
`;

export const fullWidthAndHeightStyles = css`
  width: 100%;
  height: 100%;
`;
