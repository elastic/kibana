/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
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

  useEffect(() => {
    setSelectedTabId(hasConflict ? TAB_IDS.issues : TAB_IDS.selected);
  }, [hasConflict]);

  const locationsTabLabel = i18n.translate(
    'xpack.searchInferenceEndpoints.confirmRegionSelection.locationsTabLabel',
    { defaultMessage: 'Locations' }
  );

  const issuesTabLabel = i18n.translate(
    'xpack.searchInferenceEndpoints.confirmRegionSelection.issuesTabLabel',
    { defaultMessage: 'Issues' }
  );

  return (
    <>
      <EuiTabs size="s" bottomBorder={true}>
        <EuiTab
          isSelected={selectedTabId === TAB_IDS.selected}
          onClick={() => setSelectedTabId(TAB_IDS.selected)}
          data-test-subj="confirmRegionSelectionSelectedTab"
        >
          {locationsTabLabel}
        </EuiTab>
        <EuiTab
          isSelected={selectedTabId === TAB_IDS.issues}
          onClick={() => setSelectedTabId(TAB_IDS.issues)}
          disabled={!hasConflict}
          append={
            <EuiNotificationBadge
              size="s"
              color={hasConflict ? 'accent' : 'subdued'}
              data-test-subj="confirmRegionSelectionIssuesBadge"
            >
              {issuesCount}
            </EuiNotificationBadge>
          }
          data-test-subj="confirmRegionSelectionIssuesTab"
        >
          {issuesTabLabel}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
      {selectedTabId === TAB_IDS.selected ? (
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
      ) : (
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
      )}
    </>
  );
};
