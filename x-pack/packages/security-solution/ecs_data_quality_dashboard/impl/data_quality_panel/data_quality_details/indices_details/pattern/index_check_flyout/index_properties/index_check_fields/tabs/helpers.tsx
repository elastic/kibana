/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { INCOMPATIBLE_FIELDS } from '../../../../../../../translations';
import { getSizeInBytes } from '../../../../../../../utils/stats';
import { getIncompatibleStatBadgeColor } from '../../../../../../../utils/get_incompatible_stat_badge_color';
import { AllTab } from './all_tab';
import { CustomTab } from './custom_tab';
import { EcsCompliantTab } from './ecs_compliant_tab';
import { IncompatibleTab } from './incompatible_tab';
import {
  ALL_TAB_ID,
  CUSTOM_TAB_ID,
  ECS_COMPLIANT_TAB_ID,
  INCOMPATIBLE_TAB_ID,
  SAME_FAMILY_TAB_ID,
} from '../constants';
import * as i18n from '../../translations';
import { SameFamilyTab } from './same_family_tab';
import type {
  EcsBasedFieldMetadata,
  IlmPhase,
  MeteringStatsIndex,
  PartitionedFieldMetadata,
} from '../../../../../../../types';
import { getMarkdownComment } from '../utils/markdown';

export const getMissingTimestampComment = (): string =>
  getMarkdownComment({
    suggestedAction: `${i18n.MISSING_TIMESTAMP_CALLOUT}

${i18n.DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}
`,
    title: i18n.MISSING_TIMESTAMP_CALLOUT_TITLE,
  });

export const showMissingTimestampCallout = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): boolean => !ecsBasedFieldMetadata.some((x) => x.name === '@timestamp');

export const getEcsCompliantBadgeColor = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): string =>
  showMissingTimestampCallout(partitionedFieldMetadata.ecsCompliant) ? 'danger' : 'hollow';

const StyledBadge = styled(EuiBadge)`
  text-align: right;
  cursor: pointer;
`;

export const getTabs = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  stats,
}: {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  stats: Record<string, MeteringStatsIndex> | null;
}) => [
  {
    append: (
      <StyledBadge
        color={getIncompatibleStatBadgeColor(partitionedFieldMetadata.incompatible.length)}
      >
        {partitionedFieldMetadata.incompatible.length}
      </StyledBadge>
    ),
    content: (
      <IncompatibleTab
        docsCount={docsCount}
        formatBytes={formatBytes}
        formatNumber={formatNumber}
        ilmPhase={ilmPhase}
        indexName={indexName}
        partitionedFieldMetadata={partitionedFieldMetadata}
        patternDocsCount={patternDocsCount}
        sizeInBytes={getSizeInBytes({ indexName, stats })}
      />
    ),
    id: INCOMPATIBLE_TAB_ID,
    name: INCOMPATIBLE_FIELDS,
  },
  {
    append: <StyledBadge color="hollow">{partitionedFieldMetadata.sameFamily.length}</StyledBadge>,
    content: (
      <SameFamilyTab
        docsCount={docsCount}
        formatBytes={formatBytes}
        formatNumber={formatNumber}
        ilmPhase={ilmPhase}
        indexName={indexName}
        partitionedFieldMetadata={partitionedFieldMetadata}
        patternDocsCount={patternDocsCount}
        sizeInBytes={getSizeInBytes({ indexName, stats })}
      />
    ),
    id: SAME_FAMILY_TAB_ID,
    name: i18n.SAME_FAMILY,
  },
  {
    append: <StyledBadge color="hollow">{partitionedFieldMetadata.custom.length}</StyledBadge>,
    content: (
      <CustomTab
        docsCount={docsCount}
        formatBytes={formatBytes}
        formatNumber={formatNumber}
        ilmPhase={ilmPhase}
        indexName={indexName}
        partitionedFieldMetadata={partitionedFieldMetadata}
        patternDocsCount={patternDocsCount}
        sizeInBytes={getSizeInBytes({ indexName, stats })}
      />
    ),
    id: CUSTOM_TAB_ID,
    name: i18n.CUSTOM_FIELDS,
  },
  {
    append: (
      <StyledBadge color={getEcsCompliantBadgeColor(partitionedFieldMetadata)}>
        {partitionedFieldMetadata.ecsCompliant.length}
      </StyledBadge>
    ),
    content: (
      <EcsCompliantTab indexName={indexName} partitionedFieldMetadata={partitionedFieldMetadata} />
    ),
    id: ECS_COMPLIANT_TAB_ID,
    name: i18n.ECS_COMPLIANT_FIELDS,
  },
  {
    append: <StyledBadge color="hollow">{partitionedFieldMetadata.all.length}</StyledBadge>,
    content: <AllTab indexName={indexName} partitionedFieldMetadata={partitionedFieldMetadata} />,
    id: ALL_TAB_ID,
    name: i18n.ALL_FIELDS,
  },
];
