/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/onechat-common';

const idRegexp = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const ensureValidId = (id: string) => {
  if (!idRegexp.test(id)) {
    throw createBadRequestError(`Invalid profile id: ${id}`);
  }
};
