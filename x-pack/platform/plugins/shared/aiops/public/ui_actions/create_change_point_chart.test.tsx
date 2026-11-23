/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_DETECTION_VIEW_TYPE,
  EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE, SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { openLazyFlyout } from '@kbn/presentation-util';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { canUseAiops } from '../capabilities';
import { EmbeddableChangePointUserInput } from '../embeddables/change_point_chart/change_point_config_input';
import { EmbeddableChangePointEsqlUserInput } from '../embeddables/change_point_chart/change_point_esql_config_input';
import type { AiopsCoreSetup } from '../types';
import { createAddChangePointChartAction } from './create_change_point_chart';

jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: jest.fn(),
}));

jest.mock('../capabilities', () => ({
  canUseAiops: jest.fn(),
}));

jest.mock('../embeddables/change_point_chart/change_point_config_input', () => ({
  EmbeddableChangePointUserInput: jest.fn(() => null),
}));

jest.mock('../embeddables/change_point_chart/change_point_esql_config_input', () => ({
  EmbeddableChangePointEsqlUserInput: jest.fn(() => null),
}));

const mockOpenLazyFlyout = jest.mocked(openLazyFlyout);
const mockCanUseAiops = jest.mocked(canUseAiops);

const createContainerApi = () => ({
  uuid: 'dashboard-1',
  addNewPanel: jest.fn(),
  removePanel: jest.fn(),
  replacePanel: jest.fn(),
  getPanelCount: jest.fn(),
  getChildApi: jest.fn(),
  children$: new BehaviorSubject({}),
});

const createGetStartServices = ({
  enableEsql,
  canShowDiscover = true,
}: {
  enableEsql: boolean;
  canShowDiscover?: boolean;
}): AiopsCoreSetup['getStartServices'] =>
  jest.fn().mockResolvedValue([
    {
      uiSettings: {
        get: jest.fn((key: string) => (key === ENABLE_ESQL ? enableEsql : undefined)),
      },
      application: {
        capabilities: {
          discover_v2: { show: canShowDiscover },
        },
      },
    },
    {},
  ]);

describe('createAddChangePointChartAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseAiops.mockReturnValue(true);
  });

  it('keeps isCompatible gated on presentation container + canUseAiops regardless of enableESQL', async () => {
    const container = createContainerApi();
    const actionOff = createAddChangePointChartAction(
      createGetStartServices({ enableEsql: false })
    );
    const actionOn = createAddChangePointChartAction(createGetStartServices({ enableEsql: true }));

    expect(await actionOff.isCompatible!({ embeddable: container as never })).toBe(true);
    expect(await actionOn.isCompatible!({ embeddable: container as never })).toBe(true);
    expect(await actionOn.isCompatible!({ embeddable: {} as never })).toBe(false);

    mockCanUseAiops.mockReturnValue(false);
    expect(await actionOn.isCompatible!({ embeddable: container as never })).toBe(false);
  });

  it('loads the existing form and adds aiops_change_point_chart when enableESQL is false', async () => {
    const container = createContainerApi();
    const action = createAddChangePointChartAction(createGetStartServices({ enableEsql: false }));

    await action.execute({ embeddable: container as never });
    expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);

    const closeFlyout = jest.fn();
    const element = (await mockOpenLazyFlyout.mock.calls[0][0].loadContent({
      ariaLabelledBy: 'changePointConfig',
      closeFlyout,
    })) as React.ReactElement<React.ComponentProps<typeof EmbeddableChangePointUserInput>>;

    expect(element.type).toBe(EmbeddableChangePointUserInput);
    const legacyState = {
      title: 'Legacy CP',
      view_type: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      data_view_id: 'logs-dv',
      aggregation_function: 'avg' as const,
      metric_field: 'bytes',
      max_series_to_plot: 4,
    };
    element.props.onConfirm(legacyState);

    expect(container.addNewPanel).toHaveBeenCalledWith({
      panelType: EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
      serializedState: legacyState,
    });
    expect(closeFlyout).toHaveBeenCalledTimes(1);
  });

  it('loads the ES|QL form when enableESQL is true, passes Discover table permission, and adds Charts or Table panels', async () => {
    const container = createContainerApi();
    const action = createAddChangePointChartAction(
      createGetStartServices({ enableEsql: true, canShowDiscover: false })
    );

    await action.execute({ embeddable: container as never });
    expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);

    const closeFlyout = jest.fn();
    const element = (await mockOpenLazyFlyout.mock.calls[0][0].loadContent({
      ariaLabelledBy: 'changePointConfig',
      closeFlyout,
    })) as React.ReactElement<React.ComponentProps<typeof EmbeddableChangePointEsqlUserInput>>;

    expect(element.type).toBe(EmbeddableChangePointEsqlUserInput);
    expect(element.props.showTableOption).toBe(false);
    expect(element.props.dashboardParentApi).toBe(container);

    // Cancel leaves container untouched
    element.props.onCancel();
    expect(container.addNewPanel).not.toHaveBeenCalled();
    expect(closeFlyout).toHaveBeenCalledTimes(1);

    // Confirm Charts adds change_point_grid
    const esql = 'FROM logs-* | CHANGE_POINT `avg_bytes` ON bucket';
    element.props.onConfirm({
      mode: 'form',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
      esql,
      dataViewId: 'logs-dv',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    });

    expect(container.addNewPanel).toHaveBeenLastCalledWith({
      panelType: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
      serializedState: {
        title: 'Change point: avg(bytes)',
        esql,
        apply_dashboard_context: true,
        configuration: {
          mode: 'form',
          data_view_id: 'logs-dv',
          aggregation_function: 'avg',
          metric_field: 'bytes',
        },
      },
    });

    // Confirm Table adds discover_session
    element.props.onConfirm({
      mode: 'esql',
      viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE,
      esql,
    });

    expect(container.addNewPanel).toHaveBeenLastCalledWith({
      panelType: SEARCH_EMBEDDABLE_TYPE,
      serializedState: {
        tabs: [
          {
            type: 'default',
            data_source: { type: 'esql', query: esql },
            sort: [],
            column_order: ['type', '_source', 'pvalue'],
            row_height: 3,
          },
        ],
      },
    });
  });
});
