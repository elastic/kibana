/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { RulesApi } from '../services/rules_api';

export function useExistingRule(ruleId: string | undefined) {
  const rulesApi = useService(RulesApi);
  const notifications = useService(CoreStart('notifications'));
  const [isLoading, setIsLoading] = useState(false);
  const [rule, setRule] = useState<RuleResponse | null>(null);

  useEffect(() => {
    if (!ruleId) {
      setRule(null);
      return;
    }

    const loadRule = async () => {
      setIsLoading(true);

      try {
        const fetchedRule = await rulesApi.getRule(ruleId);
        setRule(fetchedRule);
      } catch (err) {
        notifications?.toasts.addError(err, {
          title: i18n.translate('xpack.alertingV2.ruleDetails.ruleLoadError', {
            defaultMessage: 'Unable to load rule',
          }),
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRule();
  }, [ruleId, rulesApi, notifications]);

  return { rule, isLoading };
}
