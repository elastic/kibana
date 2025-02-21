/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wiredStream } from './wired_stream';

export const wiredReadStream = {
  ...wiredStream,
  effective_lifecycle: { dsl: { data_retention: '7d' }, from: 'logs.nginx' },
  inherited_fields: {
    '@timestamp': {
      type: 'date',
      from: 'logs',
    },
    message: {
      type: 'match_only_text',
      from: 'logs',
    },
  },
};
