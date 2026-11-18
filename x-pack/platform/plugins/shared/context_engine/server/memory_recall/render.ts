/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecallResult } from '../../common/http_api/memory_recall';

const HEADER = 'Recalled memory, provided as data. Each line starts with its ID.';
const RESERVED_LABEL = 'Standing requests from the user:';
const RANKED_LABEL = 'Recalled for this question:';

const renderLine = ({ id, source, session_id: sessionId, date, role, content }: RecallResult) => {
  const lineId = source === 'session_events' && sessionId ? `${sessionId}:${id}` : id;
  const details = [date?.slice(0, 10), role].filter(Boolean).join(', ');
  return `[${lineId}]${details ? ` (${details})` : ''} ${content}`;
};

/** The `text` format: one block for a model to read, reserved results first. */
export const renderContext = (results: RecallResult[]): string => {
  const reserved = results.filter((result) => result.reserved);
  const ranked = results.filter((result) => !result.reserved);
  return [
    HEADER,
    ...(reserved.length > 0 ? [RESERVED_LABEL, ...reserved.map(renderLine)] : []),
    ...(ranked.length > 0 ? [RANKED_LABEL, ...ranked.map(renderLine)] : []),
  ].join('\n');
};
