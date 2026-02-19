/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { suggestEntityClassForField, type FieldRule } from '@kbn/anonymization-common';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  type FieldRuleAction,
} from '../../../hooks/field_rule_actions';
import { applyBulkFieldAction, applyFieldAction, rankFieldRules } from '../../../hooks/field_rules';
import type { FIELD_ACTION_OPTIONS } from '../../../constants';
import { FIELD_PAGE_SIZE, toFieldAction } from '../../../constants';
import { countPolicies } from './policy_helpers';

interface UseFieldRulesPanelStateParams {
  fieldRules: FieldRule[];
  onFieldRulesChange: (rules: FieldRule[]) => void;
}

export const useFieldRulesPanelState = ({
  fieldRules,
  onFieldRulesChange,
}: UseFieldRulesPanelStateParams) => {
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [fieldActionFilter, setFieldActionFilter] =
    useState<(typeof FIELD_ACTION_OPTIONS)[number]['value']>('all');
  const [fieldPageIndex, setFieldPageIndex] = useState(0);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<FieldRuleAction>(FIELD_RULE_ACTION_ALLOW);
  const [bulkEntityClass, setBulkEntityClass] = useState('MISC');

  useEffect(() => {
    setSelectedFields([]);
  }, [fieldRules]);

  const updateAllRules = useCallback(
    (updater: (currentRules: FieldRule[]) => FieldRule[]) => {
      onFieldRulesChange(updater(fieldRules));
    },
    [fieldRules, onFieldRulesChange]
  );

  const normalizedSearchQuery = fieldSearchQuery.trim().toLowerCase();
  const filteredRules = useMemo(
    () =>
      fieldRules.filter((rule) => {
        if (fieldActionFilter !== 'all' && toFieldAction(rule) !== fieldActionFilter) {
          return false;
        }
        if (!normalizedSearchQuery) {
          return true;
        }
        return rule.field.toLowerCase().includes(normalizedSearchQuery);
      }),
    [fieldRules, fieldActionFilter, normalizedSearchQuery]
  );
  const rankedRules = useMemo(
    () =>
      rankFieldRules(filteredRules, {
        query: fieldSearchQuery,
        ecsBoost: true,
        // Keep recency boost disabled for now.
        recentFields: [],
      }),
    [fieldSearchQuery, filteredRules]
  );

  const pagedRules = useMemo(
    () =>
      rankedRules.slice(fieldPageIndex * FIELD_PAGE_SIZE, (fieldPageIndex + 1) * FIELD_PAGE_SIZE),
    [fieldPageIndex, rankedRules]
  );

  const allRuleFields = useMemo(() => fieldRules.map((rule) => rule.field), [fieldRules]);
  const selectedCount = selectedFields.length;
  const allFieldsSelected = allRuleFields.length > 0 && selectedCount === allRuleFields.length;
  const policyCounters = useMemo(() => countPolicies(fieldRules), [fieldRules]);

  const toggleSelectAllFields = useCallback(() => {
    if (allFieldsSelected) {
      setSelectedFields([]);
      return;
    }

    setSelectedFields(allRuleFields);
  }, [allFieldsSelected, allRuleFields, setSelectedFields]);

  const onRuleActionChange = useCallback(
    (field: string, action: FieldRuleAction) => {
      updateAllRules((prev) => {
        const targetRule = prev.find((rule) => rule.field === field);
        if (!targetRule) {
          return prev;
        }

        const nextEntityClass =
          action === FIELD_RULE_ACTION_ANONYMIZE && !targetRule.anonymized
            ? suggestEntityClassForField(field) ?? 'MISC'
            : undefined;

        return applyFieldAction(prev, field, action, { entityClass: nextEntityClass });
      });
    },
    [updateAllRules]
  );

  const onRuleEntityClassChange = useCallback(
    (field: string, entityClass: string) => {
      updateAllRules((prev) => {
        const targetRule = prev.find((rule) => rule.field === field);
        if (!targetRule) {
          return prev;
        }
        return applyFieldAction(prev, field, toFieldAction(targetRule), { entityClass });
      });
    },
    [updateAllRules]
  );

  const applyBulkAction = useCallback(() => {
    updateAllRules((prev) =>
      applyBulkFieldAction(prev, selectedFields, bulkAction, {
        entityClass: bulkEntityClass,
      })
    );
  }, [bulkAction, bulkEntityClass, selectedFields, updateAllRules]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(rankedRules.length / FIELD_PAGE_SIZE));
    if (fieldPageIndex > pageCount - 1) {
      setFieldPageIndex(pageCount - 1);
    }
  }, [fieldPageIndex, rankedRules.length]);

  return {
    fieldSearchQuery,
    setFieldSearchQuery,
    fieldActionFilter,
    setFieldActionFilter,
    fieldPageIndex,
    setFieldPageIndex,
    bulkAction,
    setBulkAction,
    bulkEntityClass,
    setBulkEntityClass,
    pagedRules,
    filteredRules: rankedRules,
    allRules: fieldRules,
    selectedFields,
    setSelectedFields,
    allFieldsSelected,
    selectedCount,
    toggleSelectAllFields,
    onRuleActionChange,
    onRuleEntityClassChange,
    applyBulkAction,
    policyCounters,
  };
};
