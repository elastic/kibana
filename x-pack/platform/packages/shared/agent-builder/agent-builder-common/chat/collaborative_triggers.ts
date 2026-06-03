/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** POC: invoke agent when a collaborative message contains `@agent`. */
export const shouldInvokeAgentForCollaborativeMessage = (message: string): boolean => {
  return message.includes('@agent');
};
