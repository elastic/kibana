/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import type { SensorAPI } from '@hello-pangea/dnd';
import { Store } from 'redux';
import { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { ApmBase } from '@elastic/apm-rum';
import type { UseAddToTimeline, UseAddToTimelineProps } from './hooks/use_add_to_timeline';
import { HoverActionsConfig } from './components/hover_actions';
import { LastUpdatedAtProps } from './components/last_updated';

export interface TimelinesUIStart {
  /**
   * @deprecated Use cell-actions package instead
   */
  getHoverActions: () => HoverActionsConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTimelineReducer: () => any;
  getLastUpdated: (props: LastUpdatedAtProps) => ReactElement<LastUpdatedAtProps>;
  getUseAddToTimeline: () => (props: UseAddToTimelineProps) => UseAddToTimeline;
  getUseAddToTimelineSensor: () => (api: SensorAPI) => void;
  setTimelineEmbeddedStore: (store: Store) => void;
}

export interface TimelinesStartPlugins {
  data: DataPublicPluginStart;
  cases: CasesPublicStart;
  apm?: ApmBase;
}

export type TimelinesStartServices = CoreStart & TimelinesStartPlugins;
