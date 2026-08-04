/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetFormatFormValue } from '../create_dataset_flyout/create_dataset_flyout_form_state';

const EXTENSION_TO_FORMAT: Record<string, DatasetFormatFormValue> = {
  csv: 'csv',
  tsv: 'tsv',
  parquet: 'parquet',
  ndjson: 'ndjson',
  orc: 'orc',
};

export const inferFormatFromResource = (resource: string): DatasetFormatFormValue | '' => {
  const trimmed = resource.trim();
  if (!trimmed) {
    return '';
  }

  const pathWithoutQuery = trimmed.split(/[?#]/)[0];
  const lastSegment = pathWithoutQuery.split('/').pop() ?? pathWithoutQuery;
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === lastSegment.length - 1) {
    return '';
  }

  const extension = lastSegment.slice(dotIndex + 1).toLowerCase();
  return EXTENSION_TO_FORMAT[extension] ?? '';
};
