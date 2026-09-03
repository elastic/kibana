/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController, useFormContext } from 'react-hook-form';
import { useRuleFormServices } from '../contexts';
import { OPTIONAL_LABEL } from '../translations';
import type { FormValues } from '../types';
import { getDashboardId } from '../utils/artifact_data';
import { buildDashboardArtifactsFromSelection } from './dashboard_artifact_selection';
import { MissingDashboardsCallout } from './missing_dashboards_callout';
import { RelatedDashboardsComboBox } from './related_dashboards_combo_box';
import type { MissingDashboard } from './search_related_dashboards';

export const RelatedDashboardSelector: React.FC = () => {
  const { control } = useFormContext<FormValues>();
  const { dashboard } = useRuleFormServices();
  const relatedDashboardsLabelId = useGeneratedHtmlId({ prefix: 'relatedDashboardsLabel' });
  const [missingDashboards, setMissingDashboards] = useState<MissingDashboard[]>([]);
  const {
    field: { value: dashboardArtifacts = [], onChange },
  } = useController<FormValues, 'dashboardArtifacts'>({
    name: 'dashboardArtifacts',
    control,
  });

  const dashboardsFormData = useMemo(
    () =>
      dashboardArtifacts.flatMap((artifact) => {
        const dashboardId = getDashboardId(artifact);
        return dashboardId ? [{ id: dashboardId }] : [];
      }),
    [dashboardArtifacts]
  );

  const updateDashboardArtifacts = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(
        buildDashboardArtifactsFromSelection({
          selectedOptions,
          currentArtifacts: dashboardArtifacts,
          missingDashboards,
        })
      );
    },
    [dashboardArtifacts, missingDashboards, onChange]
  );

  const removeMissingArtifact = useCallback(
    (dashboardId: string) => {
      onChange(dashboardArtifacts.filter((artifact) => getDashboardId(artifact) !== dashboardId));
    },
    [dashboardArtifacts, onChange]
  );

  if (!dashboard) {
    // Compose Discover always provides the dashboard contract; this guard protects
    // consumers of the shared RuleFormServices type where dashboard is optional
    // (e.g. when the dashboard plugin is disabled).
    return null;
  }

  return (
    <>
      <EuiFormRow
        label={
          <span id={relatedDashboardsLabelId}>
            {i18n.translate('xpack.alertingV2.ruleForm.relatedDashboardsLabel', {
              defaultMessage: 'Related dashboards',
            })}
          </span>
        }
        fullWidth
        labelAppend={<EuiText size="xs">{OPTIONAL_LABEL}</EuiText>}
      >
        <RelatedDashboardsComboBox
          dashboard={dashboard}
          dashboardsFormData={dashboardsFormData}
          onChange={updateDashboardArtifacts}
          onMissingChange={setMissingDashboards}
          labelId={relatedDashboardsLabelId}
          placeholder={i18n.translate('xpack.alertingV2.ruleForm.relatedDashboardsPlaceholder', {
            defaultMessage: 'Link related dashboards for investigation',
          })}
        />
      </EuiFormRow>
      {missingDashboards.length > 0 && (
        <MissingDashboardsCallout missing={missingDashboards} onRemove={removeMissingArtifact} />
      )}
    </>
  );
};
