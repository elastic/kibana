/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const styles = css`
  [class*='cssTreeNode-level-'] {
    background-color: #ffffff;
    padding: 20px 10px;
    border: 1px solid;
    width: 400px;
    margin: 20px 0px;
  }

  .cssTreeNode-level-2,
  .cssTreeNode-level-3,
  .cssTreeNode-level-4,
  .cssTreeNode-level-5 {
    margin-left: 15px;
  }
`;
