/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RangeSelectTriggerContext,
  ValueClickTriggerContext,
} from '../../../../../src/plugins/embeddable/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../src/plugins/kibana_utils/public';

export type ActionContext = RangeSelectTriggerContext | ValueClickTriggerContext;

export interface Config {
  /**
   * Whether to use a user selected index pattern, stored in `indexPatternId` field.
   */
  customIndexPattern: boolean;

  /**
   * ID of index pattern picked by user in UI. If not set, drilldown will use
   * the index pattern of the visualization.
   */
  indexPatternId?: string;

  /**
   * Whether to carry over source dashboard filters and query.
   */
  carryFiltersAndQuery: boolean;

  /**
   * Whether to carry over source dashboard time range.
   */
  carryTimeRange: boolean;
}

export type CollectConfigProps = CollectConfigPropsBase<Config>;
