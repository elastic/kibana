/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { createBadRequestError, ConnectorToolConfig } from '@kbn/onechat-common';

export const validateConfig = async (configuration: ConnectorToolConfig) => {
  // Ensure query is proper ES|QL syntax
  const validationResult = await validateQuery(configuration.connector_id, {
    ignoreOnMissingCallbacks: true,
  });

  if (validationResult.errors.length > 0) {
    const message = `Validation error: \n${validationResult.errors
      .map((error) => ('text' in error ? error.text : ''))
      .join('\n')}`;
    throw createBadRequestError(message);
  }
};
