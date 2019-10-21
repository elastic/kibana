/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagFactory } from '../../../public/lib/tag';
import { TagStrings as strings } from '../../../i18n';

export const presentation: TagFactory = () => ({
  name: strings.presentation(),
  color: '#017D73',
});
