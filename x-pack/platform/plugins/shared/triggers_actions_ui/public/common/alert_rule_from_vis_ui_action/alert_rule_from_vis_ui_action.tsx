/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionTypeRegistryContract,
  AlertRuleFromVisUIActionData,
  RuleTypeRegistryContract,
} from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import type { LensApi } from '@kbn/lens-plugin/public';
import { apiIsOfType, hasBlockingError } from '@kbn/presentation-publishing';
import { ALERT_RULE_TRIGGER } from '@kbn/ui-actions-browser/src/triggers';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
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
    openLazyFlyout({
      core: this.startDependencies.coreStart,
      parentApi: embeddable.parentApi,
      flyoutProps: {
        'data-test-subj': 'lensAlertRule',
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
