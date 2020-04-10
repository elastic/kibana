/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mustache from 'mustache';
import { uniq, startCase, flattenDeep, isArray, isString } from 'lodash/fp';
import { i18n } from '@kbn/i18n';

import {
  ActionTypeModel,
  IErrorObject,
  AlertAction,
} from '../../../../../../../../../plugins/triggers_actions_ui/public/types'; // eslint-disable-line @kbn/eslint/no-restricted-paths
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TypeRegistry } from '../../../../../../../../../plugins/triggers_actions_ui/public/application/type_registry';
import { FormSchema, FormData, ValidationFunc, ERROR_CODE } from '../../../../../shared_imports';

const UUID_V4_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

const isUuidv4 = (id: string) => !!id.match(UUID_V4_REGEX);

const getActionTypeName = (actionTypeId: string) => startCase(actionTypeId.split('.')[1]);

const validateRuleActionsField = (actionTypeRegistry: TypeRegistry<ActionTypeModel>) => (
  ...data: Parameters<ValidationFunc>
): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
  console.error('validation', data);
  const [{ value, path }] = data as [{ value: AlertAction[]; path: string }];

  const errors = value.reduce((acc, actionItem) => {
    const actionTypeName = getActionTypeName(actionItem.actionTypeId);

    const errorsArray = [];

    if (!isUuidv4(actionItem.id)) {
      errorsArray.push('No connector selected');
    } else {
      const actionErrors: { errors: IErrorObject } = actionTypeRegistry
        .get(actionItem.actionTypeId)
        ?.validateParams(actionItem.params);

      if (Object.values(actionErrors.errors).length) {
        // @ts-ignore
        const filteredObjects: Array<string | string[]> = Object.values(actionErrors.errors).filter(
          item => isString(item) || isArray(item)
        );
        const uniqActionErrors = uniq(flattenDeep(filteredObjects));

        if (uniqActionErrors.length) {
          errorsArray.push(uniqActionErrors);
        }
      }

      Object.entries(actionItem.params).forEach(([paramKey, paramValue]) => {
        if (!isString(paramValue)) return;
        try {
          mustache.render(paramValue, {});
        } catch (e) {
          errorsArray.push(`${startCase(paramKey)} is not valid mustache template`);
        }
      });
    }

    if (errorsArray.length) {
      const errorsListItems = errorsArray.map(error => `*   ${error}`);

      return [...acc, `\n\n**${actionTypeName}:**\n${errorsListItems}`];
    }

    return acc;
  }, [] as string[]);

  if (errors.length) {
    return {
      code: 'ERR_FIELD_FORMAT',
      path,
      message: `${errors.join('\n')}`,
    };
  }
};

export const getSchema = ({
  actionTypeRegistry,
}: {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
}): FormSchema<FormData> => ({
  actions: {
    validations: [
      {
        validator: validateRuleActionsField(actionTypeRegistry),
      },
    ],
  },
  enabled: {},
  kibanaSiemAppUrl: {},
  throttle: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepRuleActions.fieldThrottleLabel',
      {
        defaultMessage: 'Actions frequency',
      }
    ),
    helpText: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepRuleActions.fieldThrottleHelpText',
      {
        defaultMessage:
          'Select when automated actions should be performed if a rule evaluates as true.',
      }
    ),
  },
});
