/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsS3UploadBytes = createTSVBModel(
  'awsS3UploadBytes',
  ['aws.s3_request'],
  [
    {
      id: 'bytes',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.s3_request.uploaded.bytes',
          id: 'max-bytes',
          type: 'max',
        },
      ],
    },
  ],
  '>=300s'
);
