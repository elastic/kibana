/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationHandler } from './types';

export const setMetadataHandler: OperationHandler<'set_metadata'> = ({
  dashboardData,
  operation,
  context,
}) => {
  if (operation.title === undefined && operation.description === undefined) {
    context.logger.debug('Skipping empty set_metadata operation');
    return dashboardData;
  }

  const metadataPatch = {
    ...(operation.title !== undefined ? { title: operation.title } : {}),
    ...(operation.description !== undefined ? { description: operation.description } : {}),
  };

  return {
    ...dashboardData,
    ...metadataPatch,
  };
};
