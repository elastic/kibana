/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRangeOption } from '../time_range';

export function renderStatusLine({
  timeRange,
  connector,
  stream,
}: {
  timeRange: TimeRangeOption;
  connector?: { name: string; id: string };
  stream?: { label: string };
}) {
  const parts = [
    `Time range: ${timeRange.label}`,
    `Connector: ${connector ? `${connector.name} (${connector.id})` : 'Not selected'}`,
    `Stream: ${stream ? stream.label : 'None selected'}`,
  ];

  return `\n${parts.join(' | ')}\n`;
}
