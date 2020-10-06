/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../../src/plugins/kibana_utils/public';
import { ApplyGlobalFilterActionContext } from '../../../../../../src/plugins/data/public';

export type ActionContext = ApplyGlobalFilterActionContext;

export type Config = {
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
};

export type CollectConfigProps = CollectConfigPropsBase<Config>;
