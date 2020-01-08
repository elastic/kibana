/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';

import { RowRenderer } from './row_renderer';

export const plainRowRenderer: RowRenderer = {
  isInstance: _ => true,
  renderRow: ({ children }) => <>{children}</>,
};
