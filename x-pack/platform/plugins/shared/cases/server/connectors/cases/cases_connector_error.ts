/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskErrorSource, createTaskRunError } from '@kbn/task-manager-plugin/server';
import { httpResponseUserErrorCodes } from '@kbn/actions-plugin/server/lib/create_and_throw_user_error';
import { CaseError } from '../../common/error';

export class CasesConnectorError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
  }
}

export const isCasesConnectorError = (error: unknown): error is CasesConnectorError =>
  error instanceof CasesConnectorError;

export const isCasesClientError = (error: unknown): error is CaseError =>
  error instanceof CaseError;

export const createTaskUserError = (error: CasesConnectorError) => {
  const statusCode = error.statusCode;

  if (statusCode != null && [...httpResponseUserErrorCodes, 400].includes(Number(statusCode))) {
    return createTaskRunError(error, TaskErrorSource.USER) as CasesConnectorError;
  }

  return error;
};
