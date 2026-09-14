/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { InvalidJudgeConfigError } from '../../../evaluators/user_defined/validate_config';
import { BuiltInEvaluatorNameError } from '../../../storage/evaluators/built_in_evaluator_name_error';
import { EvaluatorAlreadyExistsError } from '../../../storage/evaluators/evaluator_already_exists_error';
import { EvaluatorNotFoundError } from '../../../storage/evaluators/evaluator_not_found_error';
import { InvalidEvaluatorNameError } from '../../../storage/evaluators/invalid_evaluator_name_error';

export const builtInEvaluatorMessage = (name: string): string =>
  new BuiltInEvaluatorNameError(name).message;

/**
 * Turns the definition store's domain errors into responses. Everything else is
 * logged with its detail and answered with `fallbackMessage`, so an internal
 * failure never leaks its wording to the caller.
 */
export const handleEvaluatorError = ({
  error,
  response,
  logger,
  fallbackMessage,
}: {
  error: unknown;
  response: KibanaResponseFactory;
  logger: Logger;
  fallbackMessage: string;
}): IKibanaResponse => {
  if (error instanceof EvaluatorNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }

  if (error instanceof EvaluatorAlreadyExistsError || error instanceof BuiltInEvaluatorNameError) {
    return response.customError({ statusCode: 409, body: { message: error.message } });
  }

  if (error instanceof InvalidEvaluatorNameError || error instanceof InvalidJudgeConfigError) {
    return response.badRequest({ body: { message: error.message } });
  }

  logger.error(`${fallbackMessage}: ${error instanceof Error ? error.message : String(error)}`);
  return response.customError({ statusCode: 500, body: { message: fallbackMessage } });
};
