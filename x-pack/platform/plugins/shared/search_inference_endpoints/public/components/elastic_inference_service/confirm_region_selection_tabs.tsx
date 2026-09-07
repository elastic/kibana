/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiTabbedContent,
  EuiText,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CspRegion } from '../../../common/types';
import type { PolicyMode, RegionPolicyConflictArtifact } from '../../types';
import { getGeoDisplayName, getRegionDisplayName, regionKey } from '../../utils/eis_utils';
import { ConfirmRegionSelectionIssueRow } from './confirm_region_selection_issue_row';

const TAB_IDS = {
  selected: 'selected',
  issues: 'issues',
} as const;

type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS];

export interface ConfirmRegionSelectionTabsProps {
  mode: PolicyMode;
  selectedRegions: CspRegion[];
  selectedGeos: string[];
  conflictArtifacts?: RegionPolicyConflictArtifact[];
}

export const ConfirmRegionSelectionTabs: React.FC<ConfirmRegionSelectionTabsProps> = ({
  mode,
  selectedRegions,
  selectedGeos,
  conflictArtifacts,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<TabId>(TAB_IDS.selected);
  const hasConflict = Boolean(conflictArtifacts?.length);
  const isGeoMode = mode === 'geo';
  const issuesCount = conflictArtifacts?.length ?? 0;
  const selectedCount = isGeoMode ? selectedGeos.length : selectedRegions.length;

  useEffect(() => {
    setSelectedTabId(hasConflict ? TAB_IDS.issues : TAB_IDS.selected);
  }, [hasConflict]);

  const tabs = useMemo((): EuiTabbedContentTab[] => {
    return [
      {
        id: TAB_IDS.selected,
        name: isGeoMode
          ? i18n.translate(
              'xpack.searchInferenceEndpoints.confirmRegionSelection.selectedGeographyTabLabel',
              { defaultMessage: 'Selected geography' }
            )
          : i18n.translate(
              'xpack.searchInferenceEndpoints.confirmRegionSelection.selectedRegionTabLabel',
              { defaultMessage: 'Selected region' }
            ),
        append: (
          <EuiNotificationBadge
            size="s"
            color="subdued"
            data-test-subj="confirmRegionSelectionSelectedBadge"
          >
            {selectedCount}
          </EuiNotificationBadge>
        ),
        content: (
          <EuiText size="s" data-test-subj="confirmRegionSelectionSelectedList">
            {isGeoMode ? (
              <ul data-test-subj="confirmRegionSelectionGeoList">
                {selectedGeos.map((geo) => (
                  <li key={geo}>{getGeoDisplayName(geo)}</li>
                ))}
              </ul>
            ) : (
              <ul data-test-subj="confirmRegionSelectionRegionList">
                {selectedRegions.map((region) => (
                  <li key={regionKey(region)}>{getRegionDisplayName(region)}</li>
                ))}
              </ul>
            )}
          </EuiText>
        ),
        'data-test-subj': 'confirmRegionSelectionSelectedTab',
      },
      {
        id: TAB_IDS.issues,
        name: i18n.translate(
          'xpack.searchInferenceEndpoints.confirmRegionSelection.issuesTabLabel',
          { defaultMessage: 'Issues' }
        ),
        disabled: !hasConflict,
        append: hasConflict && (
          <EuiNotificationBadge
            size="s"
            color="accent"
            data-test-subj="confirmRegionSelectionIssuesBadge"
          >
            {issuesCount}
          </EuiNotificationBadge>
        ),
        content: (
          <EuiFlexGroup
            gutterSize="m"
            direction="column"
            data-test-subj="confirmRegionSelectionIssuesList"
          >
            {(conflictArtifacts ?? []).map((artifact, index) => (
              <EuiFlexItem
                key={`${artifact.type}-${artifact.name}`}
                data-test-subj={`confirmRegionSelectionIssue-${index}`}
              >
                <ConfirmRegionSelectionIssueRow artifact={artifact} index={index} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
        'data-test-subj': 'confirmRegionSelectionIssuesTab',
      },
    ];
  }, [
    conflictArtifacts,
    hasConflict,
    isGeoMode,
    issuesCount,
    selectedCount,
    selectedGeos,
    selectedRegions,
  ]);

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [selectedTabId, tabs]
  );

  const onTabClick = useCallback((tab: EuiTabbedContentTab) => {
    if (tab.id === TAB_IDS.selected) {
      setSelectedTabId(TAB_IDS.selected);
      return;
    }
    if (tab.id === TAB_IDS.issues) {
      setSelectedTabId(TAB_IDS.issues);
    }
  }, []);

  return <EuiTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />;
};
