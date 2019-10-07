/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as SECTION_LABELS from '../sectionLabels';

export const TRANSACTION_METADATA_SECTIONS = [
  {
    ...SECTION_LABELS.LABELS,
    required: true
  },
  SECTION_LABELS.HTTP,
  SECTION_LABELS.HOST,
  SECTION_LABELS.CONTAINER,
  SECTION_LABELS.SERVICE,
  SECTION_LABELS.PROCESS,
  SECTION_LABELS.AGENT,
  SECTION_LABELS.URL,
  {
    ...SECTION_LABELS.PAGE,
    key: 'transaction.page'
  },
  {
    ...SECTION_LABELS.USER,
    required: true
  },
  SECTION_LABELS.USER_AGENT,
  SECTION_LABELS.CUSTOM_TRANSACTION
];
