/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import styled from 'styled-components';

import {
  ALL_FIELDS,
  CUSTOM_FIELDS,
  ECS_COMPLIANT_FIELDS,
  INCOMPATIBLE_FIELDS,
  SAME_FAMILY,
} from '../../../../../../../translations';
import { getSizeInBytes } from '../../../../../../../utils/stats';
import { getIncompatibleStatBadgeColor } from '../../../../../../../utils/get_incompatible_stat_badge_color';
import { AllTab } from '../all_tab';
import { CustomTab } from '../custom_tab';
import { EcsCompliantTab } from '../ecs_compliant_tab';
import { IncompatibleTab } from '../incompatible_tab';
import { SameFamilyTab } from '../same_family_tab';
import { ALL_TAB_ID, CUSTOM_TAB_ID, ECS_COMPLIANT_TAB_ID } from '../constants';
import { IlmPhase, MeteringStatsIndex, PartitionedFieldMetadata } from '../../../../../../../types';
import { isTimestampFieldMissing } from './is_timestamp_field_missing';
import { INCOMPATIBLE_TAB_ID, SAME_FAMILY_TAB_ID } from '../../../constants';

const StyledBadge = styled(EuiBadge)`
  text-align: right;
  cursor: pointer;
`;

interface TabOpts {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  stats: Record<string, MeteringStatsIndex> | null;
}

type TabProps = TabOpts | Pick<TabOpts, 'partitionedFieldMetadata' | 'indexName'>;

interface Tab {
  append: JSX.Element;
  content: JSX.Element;
  id: string;
  name: string;
}

interface CreateTabOpts<T extends TabProps> {
  id: string;
  name: string;
  badgeColor: string;
  count: number;
  TabContentComponent: TabContentComponent<T>;
  tabProps: T;
}

/**
 * Determines the badge color for ECS compliant fields
 */
export const getEcsCompliantBadgeColor = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): string => (isTimestampFieldMissing(partitionedFieldMetadata.ecsCompliant) ? 'danger' : 'hollow');

type TabContentComponent<T extends TabProps> = React.FC<T>;

/**
 * Creates a tab with common properties
 */
const createTab = <T extends TabProps>({
  id,
  name,
  badgeColor,
  count,
  TabContentComponent,
  tabProps,
}: CreateTabOpts<T>): Tab => ({
  append: <StyledBadge color={badgeColor}>{count}</StyledBadge>,
  content: <TabContentComponent {...tabProps} />,
  id,
  name,
});

/**
 * Creates the incompatible fields tab
 */
export const getIncompatibleFieldsTab = (opts: TabOpts): Tab =>
  createTab({
    id: INCOMPATIBLE_TAB_ID,
    name: INCOMPATIBLE_FIELDS,
    badgeColor: getIncompatibleStatBadgeColor(opts.partitionedFieldMetadata.incompatible.length),
    count: opts.partitionedFieldMetadata.incompatible.length,
    TabContentComponent: IncompatibleTab,
    tabProps: {
      ...opts,
      sizeInBytes: getSizeInBytes({ indexName: opts.indexName, stats: opts.stats }),
    },
  });

/**
 * Creates the same family fields tab
 */
export const getSameFamilyFieldsTab = (opts: TabOpts): Tab =>
  createTab({
    id: SAME_FAMILY_TAB_ID,
    name: SAME_FAMILY,
    badgeColor: 'hollow',
    count: opts.partitionedFieldMetadata.sameFamily.length,
    TabContentComponent: SameFamilyTab,
    tabProps: {
      ...opts,
      sizeInBytes: getSizeInBytes({ indexName: opts.indexName, stats: opts.stats }),
    },
  });

/**
 * Creates the custom fields tab
 */
export const getCustomFieldsTab = (opts: TabOpts): Tab =>
  createTab({
    id: CUSTOM_TAB_ID,
    name: CUSTOM_FIELDS,
    badgeColor: 'hollow',
    count: opts.partitionedFieldMetadata.custom.length,
    TabContentComponent: CustomTab,
    tabProps: {
      ...opts,
      sizeInBytes: getSizeInBytes({ indexName: opts.indexName, stats: opts.stats }),
    },
  });

/**
 * Creates the ECS compliant fields tab
 */
export const getEcsCompliantFieldsTab = (opts: TabOpts): Tab =>
  createTab({
    id: ECS_COMPLIANT_TAB_ID,
    name: ECS_COMPLIANT_FIELDS,
    badgeColor: getEcsCompliantBadgeColor(opts.partitionedFieldMetadata),
    count: opts.partitionedFieldMetadata.ecsCompliant.length,
    TabContentComponent: EcsCompliantTab,
    tabProps: {
      indexName: opts.indexName,
      partitionedFieldMetadata: opts.partitionedFieldMetadata,
    },
  });

/**
 * Creates the all fields tab
 */
export const getAllFieldsTab = (opts: TabOpts): Tab =>
  createTab({
    id: ALL_TAB_ID,
    name: ALL_FIELDS,
    badgeColor: 'hollow',
    count: opts.partitionedFieldMetadata.all.length,
    TabContentComponent: AllTab,
    tabProps: {
      indexName: opts.indexName,
      partitionedFieldMetadata: opts.partitionedFieldMetadata,
    },
  });

/**
 * Gets all tabs
 */
export const getTabs = (opts: TabOpts): Tab[] => [
  getIncompatibleFieldsTab(opts),
  getSameFamilyFieldsTab(opts),
  getCustomFieldsTab(opts),
  getEcsCompliantFieldsTab(opts),
  getAllFieldsTab(opts),
];
