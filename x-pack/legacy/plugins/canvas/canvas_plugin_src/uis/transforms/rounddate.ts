/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformFactory } from '../../../types/transforms';
import { Arguments } from '../../functions/common/rounddate';

export const rounddate: TransformFactory<Arguments> = () => ({
  name: 'rounddate',
  displayName: 'Round date',
  args: [
    {
      name: 'format',
      displayName: 'Format',
      argType: 'dateformat',
      help: 'Select or enter a MomentJS format to round the date',
    },
  ],
});
