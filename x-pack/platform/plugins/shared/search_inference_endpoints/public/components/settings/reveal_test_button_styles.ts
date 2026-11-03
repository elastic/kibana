/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const TEST_BUTTON_CLASS_NAME = 'revealableTestButton';

export const revealTestButtonOnHoverStyles = css`
  .${TEST_BUTTON_CLASS_NAME} {
    opacity: 0;
  }
  &:hover .${TEST_BUTTON_CLASS_NAME}, .${TEST_BUTTON_CLASS_NAME}:focus-within {
    opacity: 1;
  }
  @media (hover: none) {
    .${TEST_BUTTON_CLASS_NAME} {
      opacity: 1;
    }
  }
`;
