/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { episodeSnoozedTriggerCommonDefinition } from '../../../../common/workflows/triggers';
import { AlertingTriggerIcon } from './alerting_trigger_icon';

export const episodeSnoozedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...episodeSnoozedTriggerCommonDefinition,
  icon: AlertingTriggerIcon,
};
