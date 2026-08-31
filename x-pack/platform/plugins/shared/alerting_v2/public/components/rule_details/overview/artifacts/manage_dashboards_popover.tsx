/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
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
import { useDebounceFn } from '@kbn/react-hooks';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { resolveArtifactId } from '@kbn/alerting-v2-utils';
import {
  getDashboardId,
  mapArtifacts,
  partitionArtifactsByDashboardType,
  resolveDashboardsByIds,
  searchRelatedDashboard,
  type Dashboard,
  type RuleArtifactPayload,
} from '@kbn/alerting-v2-rule-form';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';

export const SELECTABLE_LIST_MAX_HEIGHT = 320;
const SEARCH_DEBOUNCE_MS = 300;

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

  const [searchResults, setSearchResults] = useState<Dashboard[]>([]);
  const [titleById, setTitleById] = useState<Map<string, string>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const popoverContentStyles = useMemo(
    () => css`
      width: ${euiTheme.base * 30}px;
    `,
    [euiTheme.base]
  );

  const popoverTitleStyles = useMemo(
    () => css`
      border-bottom: none;
    `,
    []
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

  const mergeTitles = useCallback((dashboards: Dashboard[]) => {
    setTitleById((current) => {
      const next = new Map(current);
      for (const entry of dashboards) {
        next.set(entry.id, entry.title);
      }
      return next;
    });
  }, []);

  const searchRequestIdRef = useRef(0);

  const loadSearchResults = useCallback(
    async (search?: string) => {
      const requestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      try {
        const results = await searchRelatedDashboard(dashboard, { search: search?.trim() });
        if (requestId !== searchRequestIdRef.current) {
          return;
        }
        setSearchResults(results);
        mergeTitles(results);
      } catch {
        if (requestId !== searchRequestIdRef.current) {
          return;
        }
        setSearchResults([]);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    [dashboard, mergeTitles]
  );

  const { run: debouncedLoadSearchResults } = useDebounceFn(loadSearchResults, {
    wait: SEARCH_DEBOUNCE_MS,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ignore = false;
    const attachedIds = existingDashboardArtifacts.flatMap((artifact) => {
      const dashboardId = getDashboardId(artifact);
      return dashboardId ? [dashboardId] : [];
    });
    setSelectedIds(new Set(attachedIds));
    setTitleById(new Map());
    setSearchResults([]);
    setSearchValue('');
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

        mergeTitles([...resolveResult.resolved, ...searchResult]);
        setSearchResults(searchResult);
      } catch {
        if (!ignore) {
          setSearchResults([]);
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
  }, [dashboard, existingDashboardArtifacts, isOpen, mergeTitles]);

  const options = useMemo((): EuiSelectableOption[] => {
    const attachedOptions: EuiSelectableOption[] = [];
    const otherOptions: EuiSelectableOption[] = [];

    for (const dashboardId of selectedIds) {
      const knownTitle = titleById.get(dashboardId);
      attachedOptions.push({
        key: dashboardId,
        label:
          knownTitle ??
          i18n.translate(
            'xpack.alertingV2.ruleDetails.artifacts.dashboards.unknownDashboardOption',
            { defaultMessage: 'Unknown dashboard ({id})', values: { id: dashboardId } }
          ),
        checked: 'on',
        'data-test-subj': `ruleDashboardSelectableOption-${dashboardId}`,
      });
    }

    for (const entry of searchResults) {
      if (selectedIds.has(entry.id)) {
        continue;
      }
      otherOptions.push({
        key: entry.id,
        label: entry.title,
        checked: undefined,
        'data-test-subj': `ruleDashboardSelectableOption-${entry.id}`,
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
  }, [searchResults, selectedIds, titleById]);

  const handleSelectionChange = useCallback(
    (
      _nextOptions: EuiSelectableOption[],
      _event: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption
    ) => {
      if (!changedOption.key || changedOption.isGroupLabel) {
        return;
      }

      const dashboardId = changedOption.key;
      setSelectedIds((current) => {
        const next = new Set(current);
        if (changedOption.checked === 'on') {
          next.add(dashboardId);
        } else {
          next.delete(dashboardId);
        }
        return next;
      });
    },
    []
  );

  const handleSearchChange = useCallback(
    (nextSearch: string) => {
      setSearchValue(nextSearch);
      debouncedLoadSearchResults(nextSearch);
    },
    [debouncedLoadSearchResults]
  );

  const handleSave = useCallback(() => {
    const draftDashboardArtifacts: RuleArtifactPayload = [...selectedIds].map((dashboardId) => {
      const existingArtifact = existingDashboardArtifacts.find(
        (artifact) => getDashboardId(artifact) === dashboardId
      );
      return {
        id: resolveArtifactId(DASHBOARD_ARTIFACT_TYPE, existingArtifact?.id),
        type: DASHBOARD_ARTIFACT_TYPE,
        data: { dashboardId },
      };
    });
    onSave(mapArtifacts([...otherArtifacts, ...draftDashboardArtifacts]) ?? []);
  }, [existingDashboardArtifacts, onSave, otherArtifacts, selectedIds]);

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      panelPaddingSize="none"
      panelProps={{
        css: css`
          overflow: hidden;
        `,
      }}
      anchorPosition="rightCenter"
      ownFocus
      initialFocus="[data-test-subj='ruleDashboardArtifactsSearch']"
      aria-labelledby={popoverTitleId}
      data-test-subj="ruleDashboardArtifactsManagePopover"
    >
      <EuiPopoverTitle paddingSize="s" id={popoverTitleId} css={popoverTitleStyles}>
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
            isPreFiltered
            searchProps={{
              value: searchValue,
              onChange: handleSearchChange,
              placeholder: i18n.translate(
                'xpack.alertingV2.ruleDetails.artifacts.dashboards.searchPlaceholder',
                { defaultMessage: 'Search Dashboard' }
              ),
              compressed: true,
              isLoading: isSearching,
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
            }}
            data-test-subj="ruleDashboardArtifactsSelectable"
          >
            {(list, search) => (
              <>
                <div css={searchPaddingStyles}>{search}</div>
                <div
                  style={{ maxHeight: SELECTABLE_LIST_MAX_HEIGHT, overflowY: 'auto' }}
                  data-test-subj="ruleDashboardArtifactsSelectableList"
                >
                  {list}
                </div>
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
