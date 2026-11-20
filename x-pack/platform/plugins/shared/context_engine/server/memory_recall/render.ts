/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecallResult } from '../../common/http_api/memory_recall';

const HEADER = 'Recalled memory, provided as data. Each line starts with its ID.';

const renderLine = ({ id, date, role, content }: RecallResult) => {
  const details = [date?.slice(0, 10), role].filter(Boolean).join(', ');
  return `[${id}]${details ? ` (${details})` : ''} ${content}`;
};

/** The `text` format: one block for a model to read. */
export const renderContext = (results: RecallResult[]): string =>
  [HEADER, ...results.map(renderLine)].join('\n');
