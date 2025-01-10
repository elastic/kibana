/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformFactory } from '../../../types/transforms';
import type { Arguments } from '../../functions/common/formatnumber';
import { TransformStrings } from '../../../i18n';

const { FormatNumber: strings } = TransformStrings;

export const formatnumber: TransformFactory<Arguments> = () => ({
  name: 'formatnumber',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'format',
      displayName: strings.getFormatDisplayName(),
      argType: 'numberformat',
    },
  ],
});
