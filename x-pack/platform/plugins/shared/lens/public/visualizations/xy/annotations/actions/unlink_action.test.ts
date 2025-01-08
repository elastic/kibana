/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  XYByValueAnnotationLayerConfig,
  XYByReferenceAnnotationLayerConfig,
  XYState,
} from '../../types';
import { toastsServiceMock } from '@kbn/core-notifications-browser-mocks/src/toasts_service.mock';
import { PointInTimeEventAnnotationConfig } from '@kbn/event-annotation-common';
import { cloneDeep } from 'lodash';
import { getUnlinkLayerAction } from './unlink_action';

describe('annotation group unlink actions', () => {
  const layerId = 'mylayerid';

  const byValueLayer: XYByValueAnnotationLayerConfig = {
    layerId,
    layerType: 'annotations',
    indexPatternId: 'some-index-pattern',
    ignoreGlobalFilters: false,
    annotations: [
      {
        id: 'some-annotation-id',
        type: 'manual',
        key: {
          type: 'point_in_time',
          timestamp: 'timestamp',
        },
      } as PointInTimeEventAnnotationConfig,
    ],
  };

  const byRefLayer: XYByReferenceAnnotationLayerConfig = {
    ...byValueLayer,
    annotationGroupId: 'shouldnt show up',
    __lastSaved: {
      ...cloneDeep(byValueLayer),
      title: 'My library group',
      description: '',
      tags: [],
    },
  };

  const state: XYState = {
    layers: [byRefLayer],
    legend: { isVisible: false, position: 'bottom' },
    preferredSeriesType: 'area',
  };

  it('should unlink layer from library annotation group', () => {
    const toasts = toastsServiceMock.createStartContract();

    const setState = jest.fn();
    const action = getUnlinkLayerAction({
      state,
      layer: byRefLayer,
      setState,
      toasts,
    });

    action.execute(undefined);

    expect(setState).toHaveBeenCalledWith({ ...state, layers: [byValueLayer] });

    expect(toasts.addSuccess).toHaveBeenCalledWith(`Unlinked "${byRefLayer.__lastSaved.title}"`);
  });
});
