/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateRuleId = (id: string) => {
  const regex = new RegExp('^[a-zA-Z0-9-]+$', 'g');

  if (!regex.test(id)) {
    return `Invalid rule ID, please use a-z, A-Z, 0-9, and -`;
  }
};
