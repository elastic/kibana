/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { has, snakeCase } from 'lodash/fp';
import { APP_ID, SIGNALS_INDEX_KEY } from '../../../../common/constants';
import { LegacyServices } from '../../../types';

export interface OutputError {
  message: string;
  statusCode: number;
}

export const transformError = (err: Error & { statusCode?: number }): OutputError => {
  if (Boom.isBoom(err)) {
    return {
      message: err.output.payload.message,
      statusCode: err.output.statusCode,
    };
  } else {
    if (err.statusCode != null) {
      return {
        message: err.message,
        statusCode: err.statusCode,
      };
    } else if (err instanceof TypeError) {
      // allows us to throw type errors instead of booms in some conditions
      // where we don't want to mingle Boom with the rest of the code
      return {
        message: err.message,
        statusCode: 400,
      };
    } else {
      // natively return the err and allow the regular framework
      // to deal with the error when it is a non Boom
      return {
        message: err.message ?? '(unknown error message)',
        statusCode: 500,
      };
    }
  }
};

export interface BulkError {
  id?: string;
  rule_id?: string;
  error: {
    status_code: number;
    message: string;
  };
}

export const createBulkErrorObject = ({
  ruleId,
  id,
  statusCode,
  message,
}: {
  ruleId?: string;
  id?: string;
  statusCode: number;
  message: string;
}): BulkError => {
  if (id != null && ruleId != null) {
    return {
      id,
      rule_id: ruleId,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else if (id != null) {
    return {
      id,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else if (ruleId != null) {
    return {
      rule_id: ruleId,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else {
    return {
      rule_id: '(unknown id)',
      error: {
        status_code: statusCode,
        message,
      },
    };
  }
};

export interface ImportRegular {
  rule_id: string;
  status_code: number;
  message?: string;
}

export type ImportRuleResponse = ImportRegular | BulkError;

export const isBulkError = (
  importRuleResponse: ImportRuleResponse
): importRuleResponse is BulkError => {
  return has('error', importRuleResponse);
};

export const isImportRegular = (
  importRuleResponse: ImportRuleResponse
): importRuleResponse is ImportRegular => {
  return !has('error', importRuleResponse) && has('status_code', importRuleResponse);
};

export interface ImportSuccessError {
  success: boolean;
  success_count: number;
  errors: BulkError[];
}

export const createSuccessObject = (
  existingImportSuccessError: ImportSuccessError
): ImportSuccessError => {
  return {
    success_count: existingImportSuccessError.success_count + 1,
    success: existingImportSuccessError.success,
    errors: existingImportSuccessError.errors,
  };
};

export const createImportErrorObject = ({
  ruleId,
  statusCode,
  message,
  existingImportSuccessError,
}: {
  ruleId: string;
  statusCode: number;
  message: string;
  existingImportSuccessError: ImportSuccessError;
}): ImportSuccessError => {
  return {
    success: false,
    errors: [
      ...existingImportSuccessError.errors,
      createBulkErrorObject({
        ruleId,
        statusCode,
        message,
      }),
    ],
    success_count: existingImportSuccessError.success_count,
  };
};

export const transformImportError = (
  ruleId: string,
  err: Error & { statusCode?: number },
  existingImportSuccessError: ImportSuccessError
): ImportSuccessError => {
  if (Boom.isBoom(err)) {
    return createImportErrorObject({
      ruleId,
      statusCode: err.output.statusCode,
      message: err.message,
      existingImportSuccessError,
    });
  } else if (err instanceof TypeError) {
    return createImportErrorObject({
      ruleId,
      statusCode: 400,
      message: err.message,
      existingImportSuccessError,
    });
  } else {
    return createImportErrorObject({
      ruleId,
      statusCode: err.statusCode ?? 500,
      message: err.message,
      existingImportSuccessError,
    });
  }
};

export const transformBulkError = (
  ruleId: string,
  err: Error & { statusCode?: number }
): BulkError => {
  if (Boom.isBoom(err)) {
    return createBulkErrorObject({
      ruleId,
      statusCode: err.output.statusCode,
      message: err.message,
    });
  } else if (err instanceof TypeError) {
    return createBulkErrorObject({
      ruleId,
      statusCode: 400,
      message: err.message,
    });
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: err.statusCode ?? 500,
      message: err.message,
    });
  }
};

export const getIndex = (getSpaceId: () => string, config: LegacyServices['config']): string => {
  const signalsIndex = config().get<string>(`xpack.${APP_ID}.${SIGNALS_INDEX_KEY}`);
  const spaceId = getSpaceId();

  return `${signalsIndex}-${spaceId}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const convertToSnakeCase = <T extends Record<string, any>>(obj: T): Partial<T> | null => {
  if (!obj) {
    return null;
  }
  return Object.keys(obj).reduce((acc, item) => {
    const newKey = snakeCase(item);
    return { ...acc, [newKey]: obj[item] };
  }, {});
};
