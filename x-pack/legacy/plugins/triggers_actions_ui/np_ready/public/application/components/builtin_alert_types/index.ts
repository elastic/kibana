/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActionType as getThresholdAlertType } from './threshold/expression';
import { TypeRegistry } from '../../type_registry';
import { AlertTypeModel } from '../../../types';

export function registerBuiltInAlertTypes({
  alertTypeRegistry,
}: {
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
}) {
  alertTypeRegistry.register(getThresholdAlertType());
}
