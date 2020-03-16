/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../../../../../../plugins/triggers_actions_ui/public/types';

export function validateRulesNotificationAlertType({
  testAggField,
}: {
  testAggField: string;
}): ValidationResult {
  const validationResult = { errors: {} };
  const errors = {
    // eslint-disable-next-line no-array-constructor
    aggField: new Array<string>(),
  };
  validationResult.errors = errors;
  // if (!testAggField) {
  //   errors.aggField.push(
  //     i18n.translate('xpack.triggersActionsUI.components.example.error.requiredTestAggFieldText', {
  //       defaultMessage: 'Test aggregation field is required.',
  //     })
  //   );
  // }
  return validationResult;
}
