/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import { i18n } from '@kbn/i18n';
import { StreamsCanvas } from './canvas';
import { DestinationsTab } from './destinations';
import { PipelinesTab } from './pipelines';
import { SourcesTab } from './sources';

interface NewExperienceTabConfig {
  label: string;
  Component: ComponentType;
  noPadding?: boolean;
}

/** Tab ids in the order they render in the header. */
export const NEW_EXPERIENCE_TABS = ['canvas', 'sources', 'pipelines', 'destinations'] as const;

export type NewExperienceTab = (typeof NEW_EXPERIENCE_TABS)[number];

export const DEFAULT_NEW_EXPERIENCE_TAB: NewExperienceTab = 'canvas';

export const newExperienceTabs: Record<NewExperienceTab, NewExperienceTabConfig> = {
  canvas: {
    label: i18n.translate('xpack.streams.newExperience.canvasTab', {
      defaultMessage: 'Canvas',
    }),
    Component: StreamsCanvas,
    noPadding: true,
  },
  sources: {
    label: i18n.translate('xpack.streams.newExperience.sourcesTab', {
      defaultMessage: 'Sources',
    }),
    Component: SourcesTab,
  },
  pipelines: {
    label: i18n.translate('xpack.streams.newExperience.pipelinesTab', {
      defaultMessage: 'Pipelines',
    }),
    Component: PipelinesTab,
  },
  destinations: {
    label: i18n.translate('xpack.streams.newExperience.destinationsTab', {
      defaultMessage: 'Destinations',
    }),
    Component: DestinationsTab,
  },
};

export const isNewExperienceTab = (value: string): value is NewExperienceTab =>
  NEW_EXPERIENCE_TABS.includes(value as NewExperienceTab);
