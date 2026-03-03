/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const componentStyles = {
  list: css({
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  }),
  row: css({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  }),
  value: css({
    marginInlineStart: 0,
  }),
};
