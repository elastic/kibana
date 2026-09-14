/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent as ReactMouseEvent } from 'react';
import type { DefaultItemAction } from '@elastic/eui/src/components/basic_table/action_types';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getActions } from './actions';
import type { FieldVisConfig } from '../../stats_table/types';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import type { DataVisualizerKibanaReactContextValue } from '../../../../kibana_context';

const mockTimeRange = { from: 'now-15m', to: 'now' };

const mouseEvent = (init: MouseEventInit = {}) =>
  new MouseEvent('click', init) as unknown as ReactMouseEvent;

const getServicesMock = () => {
  const navigateToPrefilledEditor = jest.fn();
  const services = {
    application: { capabilities: { visualize_v2: { show: true } } },
    lens: {
      canUseEditor: () => true,
      navigateToPrefilledEditor,
    },
    data: {
      query: {
        filterManager: { getFilters: () => [] },
        timefilter: { timefilter: { getTime: () => mockTimeRange } },
      },
    },
  } as unknown as Partial<DataVisualizerKibanaReactContextValue['services']>;
  return { services, navigateToPrefilledEditor };
};

const dataView = {
  id: 'test-data-view-id',
  timeFieldName: '@timestamp',
} as DataView;

const combinedQuery: CombinedQuery = {
  searchQueryLanguage: 'kuery',
  searchString: '',
};

const item = {
  type: 'keyword',
  fieldName: 'airline',
} as FieldVisConfig;

describe('getActions', () => {
  describe('Explore in Lens action', () => {
    const getLensAction = (services: Partial<DataVisualizerKibanaReactContextValue['services']>) =>
      getActions(dataView, services, combinedQuery, undefined).find(
        (action): action is DefaultItemAction<FieldVisConfig> =>
          'data-test-subj' in action &&
          action['data-test-subj'] === 'dataVisualizerActionViewInLensButton'
      );

    it('navigates in the current tab on a plain click', () => {
      const { services, navigateToPrefilledEditor } = getServicesMock();
      const action = getLensAction(services);

      action!.onClick!(item, mouseEvent());

      expect(navigateToPrefilledEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'dataVisualizer-airline',
          attributes: expect.objectContaining({ visualizationType: 'lnsXY' }),
          time_range: mockTimeRange,
        }),
        { openInNewTab: false }
      );
    });

    it('opens in a new tab on a modified click', () => {
      const { services, navigateToPrefilledEditor } = getServicesMock();
      const action = getLensAction(services);

      action!.onClick!(item, mouseEvent({ metaKey: true }));

      expect(navigateToPrefilledEditor).toHaveBeenCalledWith(expect.anything(), {
        openInNewTab: true,
      });

      action!.onClick!(item, mouseEvent({ ctrlKey: true }));

      expect(navigateToPrefilledEditor).toHaveBeenLastCalledWith(expect.anything(), {
        openInNewTab: true,
      });
    });

    it('does not navigate for fields without Lens attributes', () => {
      const { services, navigateToPrefilledEditor } = getServicesMock();
      const action = getLensAction(services);

      action!.onClick!({ type: 'geo_point', fieldName: 'coords' } as FieldVisConfig, mouseEvent());

      expect(navigateToPrefilledEditor).not.toHaveBeenCalled();
    });
  });
});
