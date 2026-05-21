/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { useDebounceFn } from '@kbn/react-hooks';
import { useController, useFormContext } from 'react-hook-form';
import { useRuleFormServices } from '../../form/contexts';
import type { ComposeFormValues } from './compose_form_types';
import { getDashboardsById, searchRelatedDashboard } from './search_related_dashboards';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_DEBOUNCE_OPTIONS = { wait: SEARCH_DEBOUNCE_MS };

const RelatedDashboardsSelector = ({
  uiActions,
  dashboardsFormData,
  onChange,
  placeholder,
}: {
  uiActions: UiActionsStart;
  dashboardsFormData: Array<{ id: string }>;
  onChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  placeholder: string;
}) => {
  const [dashboardOptions, setDashboardOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedDashboardOptions = useRef(false);

  useEffect(() => {
    let ignore = false;
    const loadSelectedDashboards = async () => {
      try {
        const dashboardIds = dashboardsFormData.map((dashboard) => dashboard.id);
        if (!dashboardIds.length) {
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
        setSelectedDashboards(selectedOptions);

        if (selectedOptions.length !== dashboardsFormData.length) {
          onChange(selectedOptions);
        }
      } catch {
        if (!ignore) {
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
  const { run: debouncedLoadDashboards } = useDebounceFn(loadDashboards, SEARCH_DEBOUNCE_OPTIONS);

  const handleComboBoxFocus = useCallback(() => {
    if (hasLoadedDashboardOptions.current) {
      return;
    }

    hasLoadedDashboardOptions.current = true;
    loadDashboards();
  }, [loadDashboards]);

  const onSelectionChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
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
      aria-label={placeholder}
      onChange={onSelectionChange}
      onFocus={handleComboBoxFocus}
      onSearchChange={debouncedLoadDashboards}
      data-test-subj="dashboardsSelector"
    />
  );
};

export const ComposeRelatedDashboardsField: React.FC = () => {
  const { control } = useFormContext<ComposeFormValues>();
  const { uiActions } = useRuleFormServices();
  const {
    field: { value: artifactsValue, onChange },
  } = useController<ComposeFormValues, 'artifacts'>({
    name: 'artifacts',
    control,
  });

  const artifacts = useMemo(() => artifactsValue ?? [], [artifactsValue]);
  const dashboardsFormData = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === DASHBOARD_ARTIFACT_TYPE)
        .map((artifact) => ({ id: artifact.value })),
    [artifacts]
  );

  const updateDashboardArtifacts = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const dashboardArtifacts = artifacts.filter(
        (artifact) => artifact.type === DASHBOARD_ARTIFACT_TYPE
      );
      const otherArtifacts = artifacts.filter(
        (artifact) => artifact.type !== DASHBOARD_ARTIFACT_TYPE
      );
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

      onChange([...otherArtifacts, ...nextDashboardArtifacts]);
    },
    [artifacts, onChange]
  );

  if (!uiActions) {
    // Compose Discover always provides uiActions; this guard protects non-Compose/custom consumers
    // of the shared RuleFormServices type where uiActions is optional.
    return null;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.ruleForm.relatedDashboardsLabel', {
        defaultMessage: 'Related dashboards',
      })}
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
      <RelatedDashboardsSelector
        uiActions={uiActions}
        dashboardsFormData={dashboardsFormData}
        onChange={updateDashboardArtifacts}
        placeholder={i18n.translate('xpack.alertingV2.ruleForm.relatedDashboardsPlaceholder', {
          defaultMessage: 'Link related dashboards for investigation',
        })}
      />
    </EuiFormRow>
  );
};
