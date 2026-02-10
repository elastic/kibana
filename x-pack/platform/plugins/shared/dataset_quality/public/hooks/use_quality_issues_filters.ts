/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useCallback, useMemo } from 'react';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import type { Item } from '../components/dataset_quality/filters/selector';
import {
  documentIndexFailed,
  degradedField,
  overviewPanelDatasetQualityIndicatorFailedDocs,
} from '../../common/translations';

const ISSUE_TYPE_OPTIONS = [
  { value: 'degraded', label: degradedField },
  { value: 'failed', label: documentIndexFailed },
] as const;

export const useQualityIssuesFilters = () => {
  const { service } = useDatasetQualityDetailsState();

  const { showCurrentQualityIssues, selectedIssueTypes, qualityIssues, selectedFields } =
    useSelector(service, (state) => state.context);

  const { data } = qualityIssues ?? {};

  const toggleCurrentQualityIssues = useCallback(() => {
    service.send({ type: 'TOGGLE_CURRENT_QUALITY_ISSUES' });
  }, [service]);

  // Issue type filter logic
  const issueTypeItems: Item[] = useMemo(() => {
    return ISSUE_TYPE_OPTIONS.map(({ value, label }) => ({
      label,
      checked: selectedIssueTypes.includes(value) ? 'on' : undefined,
    }));
  }, [selectedIssueTypes]);

  const onIssueTypesChange = useCallback(
    (newIssueTypeItems: Item[]) => {
      const selectedTypes = newIssueTypeItems
        .filter((item) => item.checked === 'on')
        .map((item) => {
          const option = ISSUE_TYPE_OPTIONS.find((opt) => opt.label === item.label);
          return option?.value || item.label.toLowerCase();
        });

      service.send({
        type: 'UPDATE_SELECTED_ISSUE_TYPES',
        selectedIssueTypes: selectedTypes,
      });
    },
    [service]
  );

  // Field filter logic
  const availableFields = useMemo(() => {
    if (!data) return [];
    return [
      ...new Set(
        data.map((issue) =>
          issue.type === 'degraded'
            ? { label: issue.name, value: issue.name }
            : { label: overviewPanelDatasetQualityIndicatorFailedDocs, value: issue.name }
        )
      ),
    ].sort();
  }, [data]);

  const fieldItems: Item[] = useMemo(() => {
    return availableFields.map((field) => ({
      label: field.label,
      checked: selectedFields?.includes(field.value) ? 'on' : undefined,
    }));
  }, [availableFields, selectedFields]);

  const onFieldsChange = useCallback(
    (newFieldItems: Item[]) => {
      const selectedFieldsValues = newFieldItems
        .filter((item) => item.checked === 'on')
        .map((item) => {
          const option = availableFields.find((opt) => opt.label === item.label);
          return option?.value || item.label.toLowerCase();
        });

      service.send({
        type: 'UPDATE_SELECTED_FIELDS',
        selectedFields: selectedFieldsValues,
      });
    },
    [availableFields, service]
  );

  return {
    showCurrentQualityIssues,
    toggleCurrentQualityIssues,
    issueTypeItems,
    onIssueTypesChange,
    fieldItems,
    onFieldsChange,
  };
};
