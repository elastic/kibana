/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformFactory } from '../../../types/transforms';
import { Arguments } from '../../functions/common/formatnumber';
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
