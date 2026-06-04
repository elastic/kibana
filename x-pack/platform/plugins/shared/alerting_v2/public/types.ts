/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { CreateRuleFormFlyoutProps } from './create_rule_form_flyout';
import type { CreateAlertFlyoutProps } from './create_alert_flyout';

export type { CreateAlertFlyoutLegacyItem } from './create_alert_flyout';

export interface AlertingV2PublicStart {
  DynamicRuleFormFlyout: ComponentType<CreateRuleFormFlyoutProps>;
  CreateAlertFlyout: ComponentType<CreateAlertFlyoutProps>;
}
