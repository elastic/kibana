/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { useDebounceFn } from '@kbn/react-hooks';
import {
  resolveDashboardsByIds,
  searchRelatedDashboard,
  type MissingDashboard,
} from './search_related_dashboards';

const SEARCH_DEBOUNCE_MS = 300;

const haveSameDashboardIds = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
};

export interface RelatedDashboardsComboBoxProps {
  dashboard: DashboardStart;
  dashboardsFormData: Array<{ id: string }>;
  onChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  onMissingChange: (missing: MissingDashboard[]) => void;
  placeholder: string;
  labelId: string;
}

/**
 * Controlled async multi-select for linking related dashboards.
 */
export const RelatedDashboardsComboBox = ({
  dashboard,
  dashboardsFormData,
  onChange,
  onMissingChange,
  placeholder,
  labelId,
}: RelatedDashboardsComboBoxProps) => {
  const [dashboardOptions, setDashboardOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedDashboardOptions = useRef(false);
  // Tracks the artifact ids we last resolved against so the effect doesn't re-fetch
  // when the form value's identity changes but the underlying id set does not.
  const resolvedIds = useRef<string[]>([]);

  useEffect(() => {
    let ignore = false;
    const loadSelectedDashboards = async () => {
      const dashboardIds = dashboardsFormData.map((entry) => entry.id);
      if (haveSameDashboardIds(dashboardIds, resolvedIds.current)) {
        return;
      }

      if (!dashboardIds.length) {
        resolvedIds.current = [];
        setSelectedDashboards([]);
        onMissingChange([]);
        return;
      }

      try {
        const { resolved, missing } = await resolveDashboardsByIds(dashboard, dashboardIds);
        if (ignore) {
          return;
        }
        resolvedIds.current = dashboardIds;
        setSelectedDashboards(resolved.map((entry) => ({ label: entry.title, value: entry.id })));
        onMissingChange(missing);
      } catch {
        if (ignore) {
          return;
        }
        // On a total fetch failure, surface every attachment as unavailable rather
        // than silently dropping them — the user can still see and remove them.
        // Leave `resolvedIds.current` unadvanced so a later render can retry instead
        // of permanently stranding the ids as unavailable after a transient error.
        setSelectedDashboards([]);
        onMissingChange(dashboardIds.map((id) => ({ id, notFound: false })));
      }
    };

    loadSelectedDashboards();
    return () => {
      ignore = true;
    };
  }, [dashboardsFormData, dashboard, onMissingChange]);

  const loadDashboards = useCallback(
    async (search?: string) => {
      setIsLoading(true);
      try {
        const dashboards = await searchRelatedDashboard(dashboard, { search: search?.trim() });
        setDashboardOptions(dashboards.map((entry) => ({ label: entry.title, value: entry.id })));
      } catch {
        setDashboardOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [dashboard]
  );
  const { run: debouncedLoadDashboards } = useDebounceFn(loadDashboards, {
    wait: SEARCH_DEBOUNCE_MS,
  });

  const handleSearchChange = useCallback(
    (search: string) => {
      if (!hasLoadedDashboardOptions.current) {
        hasLoadedDashboardOptions.current = true;
        loadDashboards();
        return;
      }
      debouncedLoadDashboards(search);
    },
    [debouncedLoadDashboards, loadDashboards]
  );

  const onSelectionChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedDashboards(selectedOptions);
    onChange(selectedOptions);
  };

  return (
    <EuiComboBox
      compressed
      async
      fullWidth
      isLoading={isLoading}
      options={dashboardOptions}
      selectedOptions={selectedDashboards}
      placeholder={placeholder}
      aria-labelledby={labelId}
      onChange={onSelectionChange}
      onFocus={() => handleSearchChange('')}
      onSearchChange={handleSearchChange}
      data-test-subj="dashboardsSelector"
    />
  );
};
