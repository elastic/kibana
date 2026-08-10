/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const formatSnoozeDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
  });

export const formatSnoozeFullDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
