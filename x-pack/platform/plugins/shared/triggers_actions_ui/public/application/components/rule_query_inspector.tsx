/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';

import { useKibana } from '../../common/lib/kibana';
import { loadRuleQueryInspector } from '../lib/rule_api/inspect_query';

const SUPPORTED_RULE_TYPES = new Set([OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]);

export interface RuleQueryInspectorProps {
  ruleId: string;
  ruleTypeId: string;
  alertId?: string;
}

export function RuleQueryInspector({ ruleId, ruleTypeId, alertId }: RuleQueryInspectorProps) {
  const {
    http,
    inspector,
    notifications: { toasts },
  } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);

  const handleInspect = useCallback(async () => {
    if (!inspector) return;

    setIsLoading(true);
    try {
      const result = await loadRuleQueryInspector({ http, ruleId, mode: 'execute', alertId });

      const adapter = new RequestAdapter();
      for (const query of result.queries) {
        const name = query.label ?? query.index ?? 'Query';
        const req = adapter.start(name);
        req.json(query.request);
        if (query.response) {
          req.ok({ json: query.response });
        }
      }

      inspector.open({ requests: adapter }, { title: INSPECT_TITLE });
    } catch (e) {
      toasts.addError(e instanceof Error ? e : new Error(String(e)), {
        title: INSPECT_ERROR_TITLE,
      });
    } finally {
      setIsLoading(false);
    }
  }, [http, inspector, toasts, ruleId, alertId]);

  if (!SUPPORTED_RULE_TYPES.has(ruleTypeId) || !inspector) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="ruleQueryInspectorButton"
      iconType="inspect"
      onClick={handleInspect}
      isLoading={isLoading}
    >
      {i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.buttonLabel', {
        defaultMessage: 'Inspect',
      })}
    </EuiButtonEmpty>
  );
}

const INSPECT_TITLE = i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.title', {
  defaultMessage: 'Inspect',
});

const INSPECT_ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.ruleQueryInspector.errorTitle',
  {
    defaultMessage: 'Unable to load query',
  }
);
