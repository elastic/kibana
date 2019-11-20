/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsS3: InventoryModel = {
  id: 'awsS3',
  displayName: 'S3',
  requiredModules: ['aws'],
  metrics,
  fields: {
    id: 'aws.s3.bucket.name',
    name: 'aws.s3.bucket.name',
  },
  requiredMetrics: [
    'awsS3BucketSize',
    'awsS3NumberOfObjects',
    'awsS3TotalRequests',
    'awsS3DownloadBytes',
    'awsS3UploadBytes',
  ],
};
