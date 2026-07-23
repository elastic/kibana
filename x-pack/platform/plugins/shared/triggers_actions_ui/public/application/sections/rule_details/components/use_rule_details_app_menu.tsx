/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { Rule, RuleType } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { isRuleSnoozed } from '../../../lib';
import { loadRuleQueryInspector } from '../../../lib/rule_api/inspect_query';
import { useLinkedObject } from '../hooks/use_linked_object/use_linked_object';

type AppMenuItems = NonNullable<AppHeaderMenu['items']>;

const INSPECT_SUPPORTED_RULE_TYPES = new Set([OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]);

interface UseRuleDetailsAppMenuArgs {
  rule: Rule;
  ruleType: RuleType;
  /** Whether the user can manage the rule (mirrors the old `canSaveRule` gate on the actions menu). */
  canSaveRule: boolean;
  /** Whether the rule/actions are editable from within Rules Management. */
  canEdit: boolean;
  /** Whether the edit action should be disabled (e.g. rule type not enabled in the current license). */
  isEditDisabled: boolean;
  isInternallyManaged: boolean;
  onRunRule: (ruleId: string) => void;
  onEnableDisable: (enable: boolean) => void;
  onSnooze: () => void;
  onApiKeyUpdate: (ruleId: string) => void;
  onEdit: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
}

/**
 * Builds the App Header `menu` for the rule details page. It folds the former header actions popover
 * (`RuleActionsPopover`) and the standalone "View in Discover", "View linked object" and "Inspect"
 * header buttons into a single `AppMenuConfig`.
 */
export const useRuleDetailsAppMenu = ({
  rule,
  ruleType,
  canSaveRule,
  canEdit,
  isEditDisabled,
  isInternallyManaged,
  onRunRule,
  onEnableDisable,
  onSnooze,
  onApiKeyUpdate,
  onEdit,
  onDelete,
}: UseRuleDetailsAppMenuArgs): AppHeaderMenu => {
  const {
    http,
    inspector,
    alerting,
    notifications: { toasts },
  } = useKibana().services;

  // "View linked object" (e.g. SLO burn rate rules).
  const { linkUrl, buttonText } = useLinkedObject({ rule });

  // "View in Discover" navigation is resolved asynchronously via the alerting plugin.
  const [discoverNavigation, setDiscoverNavigation] = useState<string | null>(null);
  useEffect(() => {
    if (!alerting) {
      setDiscoverNavigation(null);
      return;
    }
    let cancelled = false;
    alerting
      .getNavigation(rule.id)
      .then((nav) => {
        if (!cancelled) {
          setDiscoverNavigation(nav ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDiscoverNavigation(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [rule.id, alerting]);

  // "Inspect" opens the rule query inspector flyout.
  const canInspect = INSPECT_SUPPORTED_RULE_TYPES.has(rule.ruleTypeId) && Boolean(inspector);
  const [isInspecting, setIsInspecting] = useState(false);
  const onInspect = useCallback(async () => {
    if (!inspector) {
      return;
    }
    setIsInspecting(true);
    try {
      const result = await loadRuleQueryInspector({ http, ruleId: rule.id, mode: 'execute' });
      const adapter = new RequestAdapter();
      for (const query of result.queries) {
        const name = query.label ?? query.index ?? INSPECT_QUERY_FALLBACK_NAME;
        const request = adapter.start(name);
        request.json(query.request);
        if (query.response) {
          request.ok({ json: query.response });
        }
      }
      inspector.open({ requests: adapter }, { title: INSPECT_TITLE });
    } catch (error) {
      toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: INSPECT_ERROR_TITLE,
      });
    } finally {
      setIsInspecting(false);
    }
  }, [http, inspector, toasts, rule.id]);

  const isSnoozed = isRuleSnoozed(rule);

  return useMemo<AppHeaderMenu>(() => {
    const items: AppMenuItems = [];
    let primaryActionItem: AppHeaderMenu['primaryActionItem'];
    let enabledSwitch: AppHeaderMenu['switch'];

    if (canSaveRule) {
      // Enable/disable is materialized as a toggle in the actions area (the header status badge is
      // now non-interactive and only reflects the current state).
      enabledSwitch = {
        id: 'ruleEnabledSwitch',
        label: ENABLED_SWITCH_LABEL,
        labelProps: {},
        checked: rule.enabled,
        onChange: (checked: boolean) => onEnableDisable(checked),
        'data-test-subj': 'ruleEnabledSwitch',
      };

      // Snooze / unsnooze is a secondary action; its label reflects the current snooze state.
      const snoozeItem = {
        id: 'snoozeRule',
        order: 30,
        label: isSnoozed ? UNSNOOZE_LABEL : SNOOZE_LABEL,
        iconType: isSnoozed ? 'bell' : 'bellSlash',
        run: onSnooze,
        testId: isInternallyManaged ? 'snoozeRuleButtonInternallyManaged' : 'snoozeRuleButton',
      };

      const updateApiKeyItem = {
        id: 'updateApiKey',
        order: 70,
        overflow: true as const,
        label: UPDATE_API_KEY_LABEL,
        iconType: 'key',
        run: () => onApiKeyUpdate(rule.id),
        testId: isInternallyManaged ? 'updateAPIKeyButtonInternallyManaged' : 'updateAPIKeyButton',
      };

      if (isInternallyManaged) {
        items.push(snoozeItem, updateApiKeyItem);
      } else {
        if (canEdit) {
          primaryActionItem = {
            id: 'editRule',
            label: EDIT_LABEL,
            iconType: 'pencil',
            run: () => onEdit(rule.id),
            disableButton: isEditDisabled,
            testId: 'openEditRuleFlyoutButton',
          };
        }

        items.push(
          snoozeItem,
          {
            id: 'runRule',
            order: 10,
            overflow: true,
            label: RUN_LABEL,
            iconType: 'play',
            run: () => onRunRule(rule.id),
            testId: 'runRuleButton',
          },
          updateApiKeyItem,
          {
            id: 'deleteRule',
            order: 90,
            overflow: true,
            isDestructive: true,
            label: DELETE_LABEL,
            iconType: 'trash',
            run: () => onDelete(rule.id),
            testId: 'deleteRuleButton',
          }
        );
      }
    }

    if (discoverNavigation) {
      items.push({
        id: 'viewInDiscover',
        order: 40,
        overflow: true,
        label: VIEW_IN_DISCOVER_LABEL,
        iconType: 'discoverApp',
        href: http.basePath.prepend(discoverNavigation),
        testId: 'ruleDetails-viewInDiscover',
      });
    }

    if (linkUrl && buttonText) {
      items.push({
        id: 'viewLinkedObject',
        order: 50,
        overflow: true,
        label: buttonText,
        iconType: 'eye',
        href: linkUrl,
        testId: 'ruleDetails-viewLinkedObject',
      });
    }

    if (canInspect) {
      items.push({
        id: 'inspectRule',
        order: 60,
        overflow: true,
        label: INSPECT_LABEL,
        iconType: 'inspect',
        run: onInspect,
        isLoading: isInspecting,
        testId: 'ruleQueryInspectorButton',
      });
    }

    return { items, primaryActionItem, switch: enabledSwitch };
  }, [
    canSaveRule,
    rule.enabled,
    rule.id,
    isSnoozed,
    isInternallyManaged,
    canEdit,
    isEditDisabled,
    onEnableDisable,
    onSnooze,
    onApiKeyUpdate,
    onRunRule,
    onEdit,
    onDelete,
    discoverNavigation,
    http.basePath,
    linkUrl,
    buttonText,
    canInspect,
    onInspect,
    isInspecting,
  ]);
};

const RUN_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.runRuleButtonLabel',
  {
    defaultMessage: 'Run rule',
  }
);

const ENABLED_SWITCH_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.enabledSwitchLabel',
  { defaultMessage: 'Enabled' }
);

const SNOOZE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.snoozeRuleButtonLabel',
  { defaultMessage: 'Snooze' }
);

const UNSNOOZE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.unsnoozeRuleButtonLabel',
  { defaultMessage: 'Unsnooze' }
);

const UPDATE_API_KEY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.updateAPIKeyButtonLabel',
  { defaultMessage: 'Update API key' }
);

const EDIT_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel',
  { defaultMessage: 'Edit rule' }
);

const DELETE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.deleteRuleButtonLabel',
  { defaultMessage: 'Delete rule' }
);

const VIEW_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.viewRuleInDiscoverButtonLabel',
  { defaultMessage: 'View in Discover' }
);

const INSPECT_LABEL = i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.buttonLabel', {
  defaultMessage: 'Inspect',
});

const INSPECT_TITLE = i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.title', {
  defaultMessage: 'Inspect',
});

const INSPECT_ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.ruleQueryInspector.errorTitle',
  {
    defaultMessage: 'Unable to load query',
  }
);

const INSPECT_QUERY_FALLBACK_NAME = i18n.translate(
  'xpack.triggersActionsUI.ruleQueryInspector.queryFallbackName',
  { defaultMessage: 'Query' }
);
