/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mustache from 'mustache';
import { uniq, startCase, flattenDeep, isArray, isString } from 'lodash/fp';

import {
  ActionTypeModel,
  AlertAction,
  IErrorObject,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../../../plugins/triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TypeRegistry } from '../../../../../../../../../plugins/triggers_actions_ui/public/application/type_registry';
import * as I18n from './translations';

const UUID_V4_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

export const isUuidv4 = (id: AlertAction['id']) => !!id.match(UUID_V4_REGEX);

export const getActionTypeName = (actionTypeId: AlertAction['actionTypeId']) => {
  if (!actionTypeId) return '';
  const actionType = actionTypeId.split('.')[1];

  if (!actionType) return '';

  return startCase(actionType);
};

export const validateMustache = (params: AlertAction['params']) => {
  const errors: string[] = [];
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    if (!isString(paramValue)) return;
    try {
      mustache.render(paramValue, {});
    } catch (e) {
      errors.push(I18n.INVALID_MUSTACHE_TEMPLATE(paramKey));
    }
  });

  return errors;
};

export const validateActionParams = (
  actionItem: AlertAction,
  actionTypeRegistry: TypeRegistry<ActionTypeModel>
): string[] => {
  const actionErrors: { errors: IErrorObject } = actionTypeRegistry
    .get(actionItem.actionTypeId)
    ?.validateParams(actionItem.params);
  const actionErrorsValues = Object.values(actionErrors.errors);

  if (actionErrorsValues.length) {
    // @ts-ignore
    const filteredObjects: Array<string | string[]> = actionErrorsValues.filter(
      item => isString(item) || isArray(item)
    );
    const uniqActionErrors = uniq(flattenDeep(filteredObjects));

    if (uniqActionErrors.length) {
      return uniqActionErrors;
    }
  }

  return [];
};
