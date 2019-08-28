/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';

export const indexPatternMock = ({
  id: 'the-index-pattern-id',
  title: 'the-index-pattern-title',
  fields: [],
} as unknown) as IndexPattern;
