/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonExample, type AlertingOasOperationObject, type OasExampleEntry } from '../oas_utils';

export const buildAlertOas = ({
  requestBody,
  responses = {},
}: {
  requestBody?: OasExampleEntry;
  responses?: Record<number, OasExampleEntry>;
}): AlertingOasOperationObject => {
  const operation: AlertingOasOperationObject = {};

  if (requestBody) {
    operation.requestBody = jsonExample(requestBody.name, requestBody.summary, requestBody.value);
  }

  const responseEntries: Record<string, ReturnType<typeof jsonExample>> = {};
  for (const [status, example] of Object.entries(responses)) {
    responseEntries[status] = jsonExample(example.name, example.summary, example.value);
  }
  if (Object.keys(responseEntries).length > 0) {
    operation.responses = responseEntries;
  }

  return operation;
};
