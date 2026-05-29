/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { useDebounceFn } from '@kbn/react-hooks';
import { useController, useFormContext } from 'react-hook-form';
import { useRuleFormServices } from '../contexts';
import type { FormValues } from '../types';
import { getDashboardsById, searchRelatedDashboard } from './search_related_dashboards';

const SEARCH_DEBOUNCE_MS = 300;

const getOptionIds = (options: Array<EuiComboBoxOptionOption<string>>) =>
  options.flatMap((option) => (option.value ? [option.value] : []));

const haveSameDashboardIds = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
};

const RelatedDashboardsComboBox = ({
  uiActions,
  dashboardsFormData,
  onChange,
  placeholder,
  labelId,
}: {
  uiActions: UiActionsStart;
  dashboardsFormData: Array<{ id: string }>;
  onChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  placeholder: string;
  labelId: string;
}) => {
  const [dashboardOptions, setDashboardOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedDashboardOptions = useRef(false);
  const selectedDashboardIds = useRef<string[]>([]);

  useEffect(() => {
    let ignore = false;
    const loadSelectedDashboards = async () => {
      try {
        const dashboardIds = dashboardsFormData.map((dashboard) => dashboard.id);
        if (haveSameDashboardIds(dashboardIds, selectedDashboardIds.current)) {
          return;
        }

        if (!dashboardIds.length) {
          selectedDashboardIds.current = [];
          setSelectedDashboards([]);
          return;
        }

        const dashboards = await getDashboardsById(uiActions, dashboardIds);
        if (ignore) {
          return;
        }

        const selectedOptions = dashboards.map((dashboard) => ({
          label: dashboard.title,
          value: dashboard.id,
        }));
        selectedDashboardIds.current = getOptionIds(selectedOptions);
        setSelectedDashboards(selectedOptions);

        if (selectedOptions.length !== dashboardsFormData.length) {
          onChange(selectedOptions);
        }
      } catch {
        if (!ignore) {
          selectedDashboardIds.current = [];
          setSelectedDashboards([]);
          onChange([]);
        }
      }
    };

    loadSelectedDashboards();
    return () => {
      ignore = true;
    };
  }, [dashboardsFormData, onChange, uiActions]);

  const loadDashboards = useCallback(
    async (search?: string) => {
      setIsLoading(true);
      try {
        const dashboards = await searchRelatedDashboard(uiActions, { search: search?.trim() });
        setDashboardOptions(
          dashboards.map((dashboard) => ({ label: dashboard.title, value: dashboard.id }))
        );
      } catch {
        setDashboardOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [uiActions]
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
    selectedDashboardIds.current = getOptionIds(selectedOptions);
    setSelectedDashboards(selectedOptions);
    onChange(selectedOptions);
  };

  return (
    <EuiComboBox
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

export const RelatedDashboardSelector: React.FC = () => {
  const { control } = useFormContext<FormValues>();
  const { uiActions } = useRuleFormServices();
  const relatedDashboardsLabelId = useGeneratedHtmlId({ prefix: 'relatedDashboardsLabel' });
  const {
    field: { value: dashboardArtifacts = [], onChange },
  } = useController<FormValues, 'dashboardArtifacts'>({
    name: 'dashboardArtifacts',
    control,
  });

  const dashboardsFormData = useMemo(
    () => dashboardArtifacts.map((artifact) => ({ id: artifact.value })),
    [dashboardArtifacts]
  );

  const updateDashboardArtifacts = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const nextDashboardArtifacts = selectedOptions.flatMap((selectedOption) => {
        const dashboardId = selectedOption.value;
        if (!dashboardId) {
          return [];
        }

        const existingArtifact = dashboardArtifacts.find(
          (artifact) => artifact.value === dashboardId
        );

        return [
          {
            id: existingArtifact?.id ?? '',
            type: DASHBOARD_ARTIFACT_TYPE,
            value: dashboardId,
          },
        ];
      });

      onChange(nextDashboardArtifacts);
    },
    [dashboardArtifacts, onChange]
  );

  if (!uiActions) {
    // Compose Discover always provides uiActions; this guard protects non-Compose/custom consumers
    // of the shared RuleFormServices type where uiActions is optional.
    return null;
  }

  return (
    <EuiFormRow
      label={
        <span id={relatedDashboardsLabelId}>
          {i18n.translate('xpack.alertingV2.ruleForm.relatedDashboardsLabel', {
            defaultMessage: 'Related dashboards',
          })}
        </span>
      }
      fullWidth
      labelAppend={
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.alertingV2.ruleForm.artifactFieldOptional"
            defaultMessage="optional"
          />
        </EuiText>
      }
    >
      <RelatedDashboardsComboBox
        uiActions={uiActions}
        dashboardsFormData={dashboardsFormData}
        onChange={updateDashboardArtifacts}
        labelId={relatedDashboardsLabelId}
        placeholder={i18n.translate('xpack.alertingV2.ruleForm.relatedDashboardsPlaceholder', {
          defaultMessage: 'Link related dashboards for investigation',
        })}
      />
    </EuiFormRow>
  );
};
