/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaSavedObjectType } from '../../../../../../../../common/types/models';

export { AlertingPage } from './alerting_page';

export const ALERTING_ASSET_TYPES: KibanaSavedObjectType[] = [
  KibanaSavedObjectType.alertingRuleTemplate,
  KibanaSavedObjectType.alert,
];
