/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import * as i18n from '../translations';

export type EpisodeDetailsMainPanel = 'overview' | 'metadata' | 'timeline';

export const getEpisodeHeaderTabs = ({
  actualMainPanel,
  showRuleDependentUi,
  onSelect,
}: {
  actualMainPanel: EpisodeDetailsMainPanel;
  showRuleDependentUi: boolean;
  onSelect: (panel: EpisodeDetailsMainPanel) => void;
}): AppHeaderTab[] => [
  {
    id: 'overview',
    'data-test-subj': 'alertingV2EpisodeDetailsMainTabOverview',
    label: i18n.OVERVIEW_TAB_TITLE,
    isSelected: actualMainPanel === 'overview',
    onClick: () => onSelect('overview'),
  },
  ...(showRuleDependentUi
    ? [
        {
          id: 'metadata',
          'data-test-subj': 'alertingV2EpisodeDetailsMainTabMetadata',
          label: i18n.METADATA_TAB_TITLE,
          isSelected: actualMainPanel === 'metadata',
          onClick: () => onSelect('metadata'),
        },
      ]
    : []),
  {
    id: 'timeline',
    'data-test-subj': 'alertingV2EpisodeDetailsMainTabTimeline',
    label: i18n.TIMELINE_TAB_TITLE,
    isSelected: actualMainPanel === 'timeline',
    onClick: () => onSelect('timeline'),
  },
];
