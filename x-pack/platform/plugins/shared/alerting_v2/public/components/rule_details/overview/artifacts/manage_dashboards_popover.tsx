/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import {
  mapArtifacts,
  partitionArtifactsByDashboardType,
  resolveDashboardsByIds,
  searchRelatedDashboard,
  type Dashboard,
  type MissingDashboard,
  type RuleArtifactPayload,
} from '@kbn/alerting-v2-rule-form';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';

const SELECTABLE_LIST_MAX_HEIGHT = 320;

export interface ManageDashboardsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  button: React.ReactElement;
  dashboard: DashboardStart;
  existingArtifacts: RuleArtifactPayload;
  isSaving: boolean;
  onSave: (artifacts: RuleArtifactPayload) => void;
}

const attachedGroupLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.dashboards.attachedGroupLabel',
  { defaultMessage: 'Attached' }
);

const otherGroupLabel = i18n.translate(
  'xpack.alertingV2.ruleDetails.artifacts.dashboards.otherGroupLabel',
  { defaultMessage: 'Other dashboards' }
);

const compareByLabel = (left: EuiSelectableOption, right: EuiSelectableOption): number =>
  left.label.localeCompare(right.label);

/**
 * Popover for attaching related dashboards on the rule details page.
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
  const { euiTheme } = useEuiTheme();
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'attachDashboardsTitle' });
  const { dashboardArtifacts: existingDashboardArtifacts, otherArtifacts } = useMemo(
    () => partitionArtifactsByDashboardType(existingArtifacts),
    [existingArtifacts]
  );

  const [catalog, setCatalog] = useState<Dashboard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [missingDashboards, setMissingDashboards] = useState<MissingDashboard[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const popoverContentStyles = useMemo(
    () => css`
      width: ${euiTheme.base * 30}px;
    `,
    [euiTheme.base]
  );

  const searchPaddingStyles = useMemo(
    () => css`
      padding: 0 ${euiTheme.size.m} ${euiTheme.size.s};
    `,
    [euiTheme.size.m, euiTheme.size.s]
  );

  const loadingContainerStyles = useMemo(
    () => css`
      min-height: ${euiTheme.base * 7.5}px;
    `,
    [euiTheme.base]
  );

  const errorPaddingStyles = useMemo(
    () => css`
      padding: ${euiTheme.size.base};
    `,
    [euiTheme.size.base]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ignore = false;
    const attachedIds = existingDashboardArtifacts.map((artifact) => artifact.value);
    setSelectedIds(new Set(attachedIds));
    setMissingDashboards([]);
    setLoadError(false);
    setIsLoadingOptions(true);

    const loadOptions = async () => {
      try {
        const [resolveResult, searchResult] = await Promise.all([
          resolveDashboardsByIds(dashboard, attachedIds),
          searchRelatedDashboard(dashboard, {}),
        ]);
        if (ignore) {
          return;
        }

        const byId = new Map<string, Dashboard>();
        for (const entry of searchResult) {
          byId.set(entry.id, entry);
        }
        for (const entry of resolveResult.resolved) {
          byId.set(entry.id, entry);
        }

        setCatalog([...byId.values()]);
        setMissingDashboards(resolveResult.missing);
      } catch {
        if (!ignore) {
          setCatalog([]);
          setMissingDashboards(attachedIds.map((id) => ({ id, notFound: false })));
          setLoadError(true);
        }
      } finally {
        if (!ignore) {
          setIsLoadingOptions(false);
        }
      }
    };

    loadOptions();
    return () => {
      ignore = true;
    };
  }, [dashboard, existingDashboardArtifacts, isOpen]);

  const options = useMemo((): EuiSelectableOption[] => {
    const attachedOptions: EuiSelectableOption[] = [];
    const otherOptions: EuiSelectableOption[] = [];
    const catalogIds = new Set(catalog.map((entry) => entry.id));

    for (const entry of catalog) {
      const option: EuiSelectableOption = {
        key: entry.id,
        label: entry.title,
        checked: selectedIds.has(entry.id) ? 'on' : undefined,
        'data-test-subj': `ruleDashboardSelectableOption-${entry.id}`,
      };
      if (selectedIds.has(entry.id)) {
        attachedOptions.push(option);
      } else {
        otherOptions.push(option);
      }
    }

    for (const missing of missingDashboards) {
      if (catalogIds.has(missing.id) || !selectedIds.has(missing.id)) {
        continue;
      }
      attachedOptions.push({
        key: missing.id,
        label: i18n.translate(
          'xpack.alertingV2.ruleDetails.artifacts.dashboards.unknownDashboardOption',
          { defaultMessage: 'Unknown dashboard ({id})', values: { id: missing.id } }
        ),
        checked: 'on',
        'data-test-subj': `ruleDashboardSelectableOption-${missing.id}`,
      });
    }

    attachedOptions.sort(compareByLabel);
    otherOptions.sort(compareByLabel);

    const nextOptions: EuiSelectableOption[] = [];
    if (attachedOptions.length > 0) {
      nextOptions.push({ label: attachedGroupLabel, isGroupLabel: true });
      nextOptions.push(...attachedOptions);
    }
    if (otherOptions.length > 0) {
      nextOptions.push({ label: otherGroupLabel, isGroupLabel: true });
      nextOptions.push(...otherOptions);
    }
    return nextOptions;
  }, [catalog, missingDashboards, selectedIds]);

  const handleSelectionChange = useCallback((nextOptions: EuiSelectableOption[]) => {
    setSelectedIds(
      new Set(
        nextOptions
          .filter((option) => !option.isGroupLabel && option.checked === 'on' && option.key)
          .map((option) => option.key as string)
      )
    );
  }, []);

  const handleSave = useCallback(() => {
    const draftDashboardArtifacts: RuleArtifactPayload = [...selectedIds].map((dashboardId) => {
      const existingArtifact = existingDashboardArtifacts.find(
        (artifact) => artifact.value === dashboardId
      );
      return {
        id: existingArtifact?.id ?? '',
        type: DASHBOARD_ARTIFACT_TYPE,
        value: dashboardId,
      };
    });
    const mappedDashboards = mapArtifacts(draftDashboardArtifacts) ?? [];
    onSave([...otherArtifacts, ...mappedDashboards]);
  }, [existingDashboardArtifacts, onSave, otherArtifacts, selectedIds]);

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      ownFocus
      initialFocus="[data-test-subj='ruleDashboardArtifactsSearch']"
      aria-labelledby={popoverTitleId}
      data-test-subj="ruleDashboardArtifactsManagePopover"
    >
      <EuiPopoverTitle paddingSize="m" id={popoverTitleId}>
        {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.dashboards.managePopoverTitle', {
          defaultMessage: 'Attach related dashboards',
        })}
      </EuiPopoverTitle>
      <div css={popoverContentStyles}>
        {isLoadingOptions ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" css={loadingContainerStyles}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                size="m"
                data-test-subj="ruleDashboardArtifactsSelectableLoading"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}

        {!isLoadingOptions && loadError ? (
          <EuiText size="s" color="danger" css={errorPaddingStyles}>
            {i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.dashboards.selectableLoadError',
              { defaultMessage: 'Could not load dashboards. Try again.' }
            )}
          </EuiText>
        ) : null}

        {!isLoadingOptions && !loadError ? (
          <EuiSelectable
            aria-label={i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.dashboards.selectableAriaLabel',
              { defaultMessage: 'Attach related dashboards' }
            )}
            searchable
            searchProps={{
              placeholder: i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.dashboards.searchPlaceholder',
                { defaultMessage: 'Search Dashboard' }
              ),
              compressed: true,
              'data-test-subj': 'ruleDashboardArtifactsSearch',
            }}
            options={options}
            onChange={handleSelectionChange}
            emptyMessage={i18n.translate(
              'xpack.alertingV2.ruleDetails.artifacts.dashboards.selectableEmpty',
              { defaultMessage: 'No dashboards found' }
            )}
            listProps={{
              paddingSize: 's',
              isVirtualized: false,
              rowHeight: 36,
              style: { maxHeight: SELECTABLE_LIST_MAX_HEIGHT },
            }}
            data-test-subj="ruleDashboardArtifactsSelectable"
          >
            {(list, search) => (
              <>
                <div css={searchPaddingStyles}>{search}</div>
                {list}
              </>
            )}
          </EuiSelectable>
        ) : null}
      </div>
      <EuiPopoverFooter paddingSize="m">
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
              isDisabled={isLoadingOptions || loadError}
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
