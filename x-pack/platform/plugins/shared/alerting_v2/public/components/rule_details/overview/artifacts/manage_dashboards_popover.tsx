/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  buildDashboardArtifactsFromSelection,
  mapArtifacts,
  MissingDashboardsCallout,
  partitionArtifactsByDashboardType,
  RelatedDashboardsComboBox,
  type MissingDashboard,
  type RuleArtifactPayload,
} from '@kbn/alerting-v2-rule-form';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { css } from '@emotion/react';

const popoverContentWidth = css`
  width: 480px;
`;

export interface ManageDashboardsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  button: React.ReactElement;
  dashboard: DashboardStart;
  existingArtifacts: RuleArtifactPayload;
  isSaving: boolean;
  onSave: (artifacts: RuleArtifactPayload) => void;
}

/**
 * Popover for managing linked dashboard artifacts on the rule details page.
 */
export const ManageDashboardsPopover = ({
  isOpen,
  onClose,
  button,
  dashboard,
  existingArtifacts,
  isSaving,
  onSave,
}: ManageDashboardsPopoverProps) => {
  const labelId = useGeneratedHtmlId({ prefix: 'manageDashboardsLabel' });
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'manageDashboardsTitle' });
  const { dashboardArtifacts: existingDashboardArtifacts, otherArtifacts } = useMemo(
    () => partitionArtifactsByDashboardType(existingArtifacts),
    [existingArtifacts]
  );

  const [draftDashboardArtifacts, setDraftDashboardArtifacts] = useState<RuleArtifactPayload>(
    existingDashboardArtifacts
  );
  const [missingDashboards, setMissingDashboards] = useState<MissingDashboard[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraftDashboardArtifacts(existingDashboardArtifacts);
    setMissingDashboards([]);
  }, [existingDashboardArtifacts, isOpen]);

  const dashboardsFormData = useMemo(
    () => draftDashboardArtifacts.map((artifact) => ({ id: artifact.value })),
    [draftDashboardArtifacts]
  );

  const handleSelectionChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setDraftDashboardArtifacts(
        buildDashboardArtifactsFromSelection({
          selectedOptions,
          currentArtifacts: draftDashboardArtifacts,
          missingDashboards,
        })
      );
    },
    [draftDashboardArtifacts, missingDashboards]
  );

  const removeMissingArtifact = useCallback((dashboardId: string) => {
    setDraftDashboardArtifacts((current) =>
      current.filter((artifact) => artifact.value !== dashboardId)
    );
    setMissingDashboards((current) => current.filter((entry) => entry.id !== dashboardId));
  }, []);

  const handleSave = useCallback(() => {
    const mappedDashboards = mapArtifacts(draftDashboardArtifacts) ?? [];
    onSave([...otherArtifacts, ...mappedDashboards]);
  }, [draftDashboardArtifacts, onSave, otherArtifacts]);

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      panelPaddingSize="m"
      anchorPosition="upCenter"
      ownFocus
      initialFocus="[data-test-subj='dashboardsSelector']"
      aria-labelledby={popoverTitleId}
      data-test-subj="ruleDashboardArtifactsManagePopover"
    >
      <EuiPopoverTitle id={popoverTitleId}>
        {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.managePopoverTitle', {
          defaultMessage: 'Manage linked dashboards',
        })}
      </EuiPopoverTitle>
      <div css={popoverContentWidth}>
        <EuiFormRow
          label={
            <span id={labelId}>
              {i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.dashboards.managePopoverLabel',
                { defaultMessage: 'Related dashboards' }
              )}
            </span>
          }
          fullWidth
        >
          <RelatedDashboardsComboBox
            dashboard={dashboard}
            dashboardsFormData={dashboardsFormData}
            onChange={handleSelectionChange}
            onMissingChange={setMissingDashboards}
            labelId={labelId}
            placeholder={i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.dashboards.managePopoverPlaceholder',
              { defaultMessage: 'Link related dashboards for investigation' }
            )}
          />
        </EuiFormRow>
        {missingDashboards.length > 0 ? (
          <MissingDashboardsCallout missing={missingDashboards} onRemove={removeMissingArtifact} />
        ) : null}
      </div>
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={onClose}
              isDisabled={isSaving}
              data-test-subj="ruleDashboardArtifactsManageCancel"
            >
              {i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.dashboards.managePopoverCancel',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              onClick={handleSave}
              isLoading={isSaving}
              data-test-subj="ruleDashboardArtifactsManageSave"
            >
              {i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.dashboards.managePopoverSave',
                { defaultMessage: 'Save' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
