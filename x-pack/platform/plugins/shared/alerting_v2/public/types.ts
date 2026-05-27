/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { CreateRuleFormFlyoutProps } from './create_rule_form_flyout';

// Structural stand-in for Discover's DataSourceProfileProvider.
// Cannot use the Discover type directly because Discover already depends on alerting_v2
// (optional plugin dep), creating a circular reference.
export interface AlertingV2DiscoverProfileProvider {
  profileId: string;
  profile: {
    getCellRenderers?: (...args: any[]) => (...args: any[]) => Record<string, ComponentType<any>>;

    getDocViewer?: (...args: any[]) => (...args: any[]) => any;
    getDefaultAppState?: () => () => { columns: Array<{ name: string; width?: number }> };

    getColumnsConfiguration?: (...args: any[]) => () => Record<string, (props: any) => any>;

    getRowAdditionalLeadingControls?: (...args: any[]) => (...args: any[]) => any[] | undefined;
  };

  resolve: (
    params: any
  ) => Promise<{ isMatch: true; context: { category: string } } | { isMatch: false }>;
}

export interface AlertingV2PublicStart {
  DynamicRuleFormFlyout: ComponentType<CreateRuleFormFlyoutProps>;
  createDiscoverProfile: () => AlertingV2DiscoverProfileProvider;
}
