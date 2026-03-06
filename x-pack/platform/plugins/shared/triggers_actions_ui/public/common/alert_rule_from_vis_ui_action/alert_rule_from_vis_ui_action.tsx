/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of } from 'rxjs';
import type {
  ActionTypeRegistryContract,
  AlertRuleFromVisUIActionData,
  RuleTypeRegistryContract,
} from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import { openLazyFlyout } from '@kbn/presentation-util';
import { css } from '@emotion/react';
import { ALERT_RULE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { type ServiceDependencies } from './rule_flyout_component';

interface Context {
  data?: AlertRuleFromVisUIActionData;
  embeddable: LensApi;
}

export class AlertRuleFromVisAction implements Action<Context> {
  private ruleTypeRegistry: RuleTypeRegistryContract;
  private actionTypeRegistry: ActionTypeRegistryContract;
  private startDependencies: ServiceDependencies;

  public type = ALERT_RULE_TRIGGER;
  public id = ALERT_RULE_TRIGGER;

  constructor(
    ruleTypeRegistry: RuleTypeRegistryContract,
    actionTypeRegistry: ActionTypeRegistryContract,
    startDependencies: ServiceDependencies
  ) {
    this.ruleTypeRegistry = ruleTypeRegistry;
    this.actionTypeRegistry = actionTypeRegistry;
    this.startDependencies = startDependencies;
  }

  public getIconType = () => 'bell';

  public async isCompatible({ embeddable }: Context) {
    const { apiIsOfType, hasBlockingError } = await import('@kbn/presentation-publishing');
    const isLensApi = apiIsOfType(embeddable, 'lens');
    if (!isLensApi || hasBlockingError(embeddable)) return false;
    const query = embeddable.query$.getValue();
    return Boolean(query && 'esql' in query);
  }

  public getDisplayName = () =>
    i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.actionName', {
      defaultMessage: 'Create alert rule',
    });

  public shouldAutoExecute = async () => true;

  public async execute({ embeddable, data }: Context) {
    const currentApp = await firstValueFrom(
      this.startDependencies.coreStart.application.currentAppId$ ?? of(undefined)
    );

    // Close all existing flyouts before opening the alert rule flyout
    if (currentApp === 'discover') {
      dismissAllFlyoutsExceptFor(DiscoverFlyouts.lensAlertRule);
    }

    openLazyFlyout({
      core: this.startDependencies.coreStart,
      parentApi: embeddable.parentApi,
      flyoutProps: {
        size: 620,
        css: css({ containerType: 'inline-size' }),
        'data-test-subj': 'lensAlertRule',
        'aria-labelledby': 'flyoutTitle',
      },
      loadContent: async ({ closeFlyout }) => {
        const { loadAlertRuleFlyoutContent } = await import('./load_alert_rule_flyout_content');
        return await loadAlertRuleFlyoutContent({
          embeddable,
          data,
          closeFlyout,
          startDependencies: this.startDependencies,
          ruleTypeRegistry: this.ruleTypeRegistry,
          actionTypeRegistry: this.actionTypeRegistry,
        });
      },
    });
  }
}
