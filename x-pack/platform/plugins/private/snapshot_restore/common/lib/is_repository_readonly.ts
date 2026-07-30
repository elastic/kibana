/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmptyRepository, Repository } from '../types';

export const isRepositoryReadOnly = ({ type, settings }: Repository | EmptyRepository): boolean => {
  if (type === 'url') {
    return true;
  }

  return settings?.readonly === true;
};
