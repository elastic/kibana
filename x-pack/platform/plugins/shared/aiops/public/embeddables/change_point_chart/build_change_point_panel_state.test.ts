/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHANGE_POINT_DETECTION_VIEW_TYPE } from '@kbn/aiops-change-point-detection/constants';
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE, SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import {
  buildChangePointPanelPackage,
  getChangePointSubmissionTitle,
  toChangePointGridConfiguration,
} from './build_change_point_panel_state';

const baseEsql = [
  'FROM logs-*',
  '| WHERE `@timestamp` >= ?_tstart AND `@timestamp` <= ?_tend',
  '| STATS `avg_bytes` = AVG(`bytes`) BY `host.name`, bucket = BUCKET(`@timestamp`, 75, ?_tstart, ?_tend)',
  '| CHANGE_POINT `avg_bytes` ON bucket BY `host.name`',
].join('\n');

describe('build_change_point_panel_state', () => {
  it('builds a Charts panel package in form mode with title and persisted configuration', () => {
    const submission = {
      mode: 'form' as const,
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql: baseEsql,
      dataViewId: 'logs-dv',
      aggregationFunction: 'avg' as const,
      metricField: 'bytes',
      splitField: 'host.name',
      partitions: ['web-1', 'web-2'],
    };

    expect(getChangePointSubmissionTitle(submission)).toBe(
      'Change point: avg(bytes) split by "host.name"'
    );
    expect(toChangePointGridConfiguration(submission)).toEqual({
      mode: 'form',
      data_view_id: 'logs-dv',
      aggregation_function: 'avg',
      metric_field: 'bytes',
      split_field: 'host.name',
      partitions: ['web-1', 'web-2'],
    });

    expect(buildChangePointPanelPackage(submission)).toEqual({
      panelType: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
      serializedState: {
        title: 'Change point: avg(bytes) split by "host.name"',
        esql: baseEsql,
        apply_dashboard_context: true,
        configuration: {
          mode: 'form',
          data_view_id: 'logs-dv',
          aggregation_function: 'avg',
          metric_field: 'bytes',
          split_field: 'host.name',
          partitions: ['web-1', 'web-2'],
        },
      },
    });
  });

  it('builds a Charts panel package in direct-edit mode without an explicit title', () => {
    const submission = {
      mode: 'esql' as const,
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql: baseEsql,
    };

    expect(getChangePointSubmissionTitle(submission)).toBeUndefined();
    expect(buildChangePointPanelPackage(submission)).toEqual({
      panelType: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
      serializedState: {
        esql: baseEsql,
        apply_dashboard_context: true,
        configuration: { mode: 'esql' },
      },
    });
  });

  it('builds a Discover session Table panel package with default and aliased CHANGE_POINT output columns', () => {
    const formTable = buildChangePointPanelPackage({
      mode: 'form',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE,
      esql: baseEsql,
      dataViewId: 'logs-dv',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    });

    expect(formTable).toEqual({
      panelType: SEARCH_EMBEDDABLE_TYPE,
      serializedState: {
        title: 'Change point: avg(bytes)',
        tabs: [
          {
            type: 'default',
            data_source: {
              type: 'esql',
              query: baseEsql,
            },
            sort: [],
            column_order: ['type', SOURCE_COLUMN, 'pvalue'],
            row_height: 3,
          },
        ],
      },
    });
    expect(formTable.serializedState).not.toHaveProperty('configuration');

    const aliasedEsql =
      'FROM logs-* | STATS `avg_bytes` = AVG(`bytes`) BY `type`, bucket = BUCKET(`@timestamp`, 75, ?_tstart, ?_tend) | CHANGE_POINT `avg_bytes` ON bucket AS change_point_type, change_point_pvalue BY `type`';
    const directTable = buildChangePointPanelPackage(
      {
        mode: 'esql',
        viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE,
        esql: aliasedEsql,
      },
      { previewTimeRange: { from: 'now-7d', to: 'now' } }
    );

    expect(directTable).toEqual({
      panelType: SEARCH_EMBEDDABLE_TYPE,
      serializedState: {
        time_range: { from: 'now-7d', to: 'now' },
        tabs: [
          {
            type: 'default',
            data_source: {
              type: 'esql',
              query: aliasedEsql,
            },
            sort: [],
            column_order: ['change_point_type', SOURCE_COLUMN, 'change_point_pvalue'],
            row_height: 3,
          },
        ],
      },
    });

    const filteredSplitEsql = `${baseEsql}\n| WHERE \`type\` IS NOT NULL`;
    expect(
      buildChangePointPanelPackage({
        mode: 'form',
        viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE,
        esql: filteredSplitEsql,
        dataViewId: 'logs-dv',
        aggregationFunction: 'avg',
        metricField: 'bytes',
        splitField: 'host.name',
      })
    ).toEqual({
      panelType: SEARCH_EMBEDDABLE_TYPE,
      serializedState: {
        title: 'Change point: avg(bytes) split by "host.name"',
        tabs: [
          {
            type: 'default',
            data_source: {
              type: 'esql',
              query: filteredSplitEsql,
            },
            sort: [],
            column_order: ['type', SOURCE_COLUMN, 'pvalue'],
            row_height: 3,
          },
        ],
      },
    });
  });
});
