/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { EsqlValue } from '../../common';

export const formatTime = (iso: string | null): string =>
  iso ? moment(iso).format('MMM D, HH:mm:ss') : '—';

export const formatDuration = (ms: number | null): string => {
  if (ms === null) {
    return '—';
  }
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
};

export const formatValue = (value: EsqlValue | undefined): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};
