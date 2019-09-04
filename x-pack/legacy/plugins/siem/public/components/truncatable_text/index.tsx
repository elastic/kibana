/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

/**
 * Applies CSS styling to enable text to be truncated with an ellipsis.
 * Example: "Don't leave me hanging..."
 *
 * Width is required, because CSS will not truncate the text unless a width is
 * specified.
 */

export const TruncatableText = styled.span<{ width?: string }>`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  // width: ${({ width }) => width};

  display: inline-block;
  max-width: 100%;
  vertical-align: top;
`;

TruncatableText.displayName = 'TruncatableText';
