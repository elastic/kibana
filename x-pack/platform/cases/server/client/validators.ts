/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const validateDuplicatedCustomFieldKeysInRequest = ({
  requestCustomFields = [],
}: {
  requestCustomFields?: Array<{ key: string }>;
}) => {
  const uniqueKeys = new Set<string>();
  const duplicatedKeys = new Set<string>();

  requestCustomFields.forEach((item) => {
    if (uniqueKeys.has(item.key)) {
      duplicatedKeys.add(item.key);
    } else {
      uniqueKeys.add(item.key);
    }
  });

  if (duplicatedKeys.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated custom field keys in request: ${Array.from(duplicatedKeys.values())}`
    );
  }
};
