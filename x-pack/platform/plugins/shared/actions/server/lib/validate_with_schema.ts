/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z as z3 } from '@kbn/zod';
import { z as z4 } from '@kbn/zod/v4';
import type {
  ActionType,
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  ValidatorServices,
} from '../types';
import { formatZodError } from './format_zod_error';

export function validateParams<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  value: unknown,
  validatorServices: ValidatorServices
) {
  return validateWithSchema(actionType, 'params', value, validatorServices);
}

export function validateConfig<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  value: unknown,
  validatorServices: ValidatorServices
) {
  return validateWithSchema(actionType, 'config', value, validatorServices);
}

export function validateSecrets<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  value: unknown,
  validatorServices: ValidatorServices
) {
  return validateWithSchema(actionType, 'secrets', value, validatorServices);
}

export function validateConnector<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(actionType: ActionType<Config, Secrets, Params, ExecutorResultData>, value: unknown) {
  if (actionType.validate && actionType.validate.connector) {
    try {
      const connectorValue = value as { config: Config; secrets: Secrets };

      // Connector config and secrets should be defined
      if (connectorValue.config == null) {
        throw new Error(`config must be defined`);
      }
      if (connectorValue.secrets == null) {
        throw new Error(`secrets must be defined`);
      }
      const result = actionType.validate.connector(connectorValue.config, connectorValue.secrets);
      if (result !== null) {
        throw new Error(result);
      }
    } catch (err) {
      throw Boom.badRequest(`error validating action type connector: ${err.message}`);
    }
  }
  return null;
}

type ValidKeys = 'params' | 'config' | 'secrets';

function validateWithSchema<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  key: ValidKeys,
  value: unknown | { config: unknown; secrets: unknown },
  validatorServices: ValidatorServices
): Record<string, unknown> {
  if (actionType.validate) {
    let name;
    try {
      switch (key) {
        case 'params':
          name = 'action params';
          if (actionType.validate.params) {
            const validatedValue = actionType.validate.params.schema.parse(value);

            if (actionType.validate.params.customValidator) {
              actionType.validate.params.customValidator(
                validatedValue as Params,
                validatorServices
              );
            }
            return validatedValue;
          }
          break;
        case 'config':
          name = 'connector type config';
          if (actionType.validate.config) {
            const validatedValue = actionType.validate.config.schema.parse(value);

            if (actionType.validate.config.customValidator) {
              actionType.validate.config.customValidator(
                validatedValue as Config,
                validatorServices
              );
            }
            return validatedValue;
          }

          break;
        case 'secrets':
          name = 'connector type secrets';
          if (actionType.validate.secrets && value !== undefined && value !== null) {
            const validatedValue = actionType.validate.secrets.schema.parse(value);

            if (actionType.validate.secrets.customValidator) {
              actionType.validate.secrets.customValidator(
                validatedValue as Secrets,
                validatorServices
              );
            }
            return validatedValue;
          }
          break;
        default:
          // should never happen, but left here for future-proofing
          throw new Error(`invalid actionType validate key: ${key}`);
      }
    } catch (err) {
      let errMessage = err.message;
      if (err instanceof z3.ZodError) {
        errMessage = formatZodError(err);
      } else if (err instanceof z4.ZodError) {
        errMessage = z4.prettifyError(err);
      }
      // we can't really i18n this yet, since the err.message isn't i18n'd itself
      throw Boom.badRequest(`error validating ${name}: ${errMessage}`);
    }
  }

  return value as Record<string, unknown>;
}
