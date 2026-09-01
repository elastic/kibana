/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { AppMountParameters, ChromeBreadcrumb } from '@kbn/core/public';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';

export type { CreateRuleOptionsFlyoutLegacyItem } from './create_rule_options_flyout';

/** Params shared by Management and in-plugin mount helpers. */
export interface AlertingV2AppMountParams {
  element: HTMLElement;
  history: AppMountParameters['history'];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
}
