/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRandomString, getRandomNumber } from '../../../../../test_utils';
import { Template } from '../../common/types';

export const getTemplate = ({
  name = getRandomString(),
  version = getRandomNumber(),
  order = getRandomNumber(),
  indexPatterns = [],
  settings,
  aliases,
  mappings,
  isManaged = false,
}: Partial<Template> = {}): Template => ({
  name,
  version,
  order,
  indexPatterns,
  settings,
  aliases,
  mappings,
  isManaged,
});
