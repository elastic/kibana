/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { DashboardsSelector } from '@kbn/dashboards-selector';
import { useController, useFormContext } from 'react-hook-form';
import { useRuleFormServices } from '../../form/contexts';
import type { ComposeFormValues } from './compose_form_types';

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
          {i18n.translate('xpack.alertingV2.ruleForm.artifactFieldOptional', {
            defaultMessage: 'optional',
          })}
        </EuiText>
      }
    >
      <DashboardsSelector
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
