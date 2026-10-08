/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';

export const LazyAutoApprovedApisField = dynamic(
  () =>
    import('./auto_approved_apis_field').then(({ AutoApprovedApisField }) => ({
      default: AutoApprovedApisField,
    })),
  { fallback: <EuiSkeletonText lines={3} /> }
);
