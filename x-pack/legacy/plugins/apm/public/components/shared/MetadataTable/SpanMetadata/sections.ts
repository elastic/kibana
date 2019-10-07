/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AGENT,
  SERVICE,
  SPAN,
  LABELS,
  TRANSACTION,
  TRACE
} from '../sectionLabels';

export const SPAN_METADATA_SECTIONS = [
  SPAN,
  AGENT,
  SERVICE,
  TRANSACTION,
  LABELS,
  TRACE
];
