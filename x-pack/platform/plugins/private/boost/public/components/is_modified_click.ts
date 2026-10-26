/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';

/** Whether a click is modified, such as to open a link in a new tab, which is left to the browser. */
export const isModifiedClick = (event: MouseEvent): boolean =>
  event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
