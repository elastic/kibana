/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import type { AlertingMountConfig } from './alerting_mount_config';

export type AlertingApp =
  | 'rules'
  | 'ruleLibrary'
  | 'alerts'
  | 'actionPolicies'
  | 'executionHistory';

interface AlertingAppMeta {
  readonly featureId: string;
  readonly heading: RegExp;
}

const ALERTING_APP_META: Record<AlertingApp, AlertingAppMeta> = {
  rules: {
    featureId: 'alerting_v2_rules',
    heading: /^Rules/i,
  },
  ruleLibrary: {
    featureId: 'alerting_v2_rules',
    heading: /rule library/i,
  },
  alerts: {
    featureId: 'alerting_v2_alerts',
    heading: /alert episodes/i,
  },
  actionPolicies: {
    featureId: 'alerting_v2_action_policies',
    heading: /action policies/i,
  },
  executionHistory: {
    featureId: 'alerting_v2_execution_history',
    heading: /execution history/i,
  },
};

/**
 * Drives navigation to the alerting_v2 apps and exposes the
 * "Privileges required" interstitial locators so specs can assert which
 * pages a given role can view.
 */
export class AlertingNavigation {
  public readonly requiredPrivilegesPrompt: Locator;

  constructor(private readonly page: ScoutPage, private readonly mountConfig: AlertingMountConfig) {
    this.requiredPrivilegesPrompt = this.page.testSubj.locator('alertingRequiredPrivilegesPrompt');
  }

  async goto(app: AlertingApp) {
    const path = `${this.mountConfig.appRoute}${this.mountConfig.paths[app]}`;
    await this.page.gotoApp(path);
  }

  pageHeading(app: AlertingApp): Locator {
    return this.page.getByRole('heading', { name: ALERTING_APP_META[app].heading, level: 1 });
  }

  requiredPrivilegeItem(app: AlertingApp): Locator {
    return this.page.testSubj.locator(
      `alertingRequiredPrivilege-${ALERTING_APP_META[app].featureId}`
    );
  }
}
