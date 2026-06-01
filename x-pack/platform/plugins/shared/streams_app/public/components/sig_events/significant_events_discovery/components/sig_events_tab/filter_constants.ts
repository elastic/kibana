/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_OPTIONS = ['promoted', 'acknowledged', 'demoted'] as const;
export type StatusOption = (typeof STATUS_OPTIONS)[number];

export const STATUS_COLORS: Record<StatusOption, string> = {
  promoted: 'success',
  acknowledged: 'warning',
  demoted: 'default',
};

const isStatusOption = (v: string): v is StatusOption =>
  (STATUS_OPTIONS as ReadonlyArray<string>).includes(v);

export const getStatusColor = (status: string): string =>
  isStatusOption(status) ? STATUS_COLORS[status] : 'default';
