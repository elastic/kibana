/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { npStart } from 'ui/new_platform';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

import styled from 'styled-components';
import { TimeRange } from 'ui/timefilter';
import { useEffect } from 'react';
import { useState } from 'react';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import {
  APPLY_FILTER_TRIGGER,
  EmbeddableInput,
  EmbeddablePanel,
  ViewMode,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';
import { Loader } from '../loader';
import { ESQuery } from '../../../common/typed_json';
import { UpdateGlobalFilterAction } from './update_global_filter_action';

interface SavedMapInput extends EmbeddableInput {
  id: string;
  timeRange?: TimeRange;
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  filters: string;
}

const EmbeddableWrapper = styled(EuiFlexGroup)`
  position: relative;
  height: 400px;
  margin: 0;
`;

export interface SavedMapProps {
  filterQuery?: ESQuery | string;
  startDate?: number;
  endDate?: number;
}

export const SavedMap = React.memo<SavedMapProps>(({ filterQuery, startDate, endDate }) => {
  const [embeddable, setEmbeddable] = React.useState(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('render:filterQuery', filterQuery);
  console.log('render:startDate', startDate);
  console.log('render:endDate', endDate);

  const loadSavedObject = async (id: string) => {
    try {
      const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);
      const embeddableObject = await factory.createFromSavedObject(
        'bdc5a6e0-c04e-11e9-a93a-29c67776e569',
        {
          filters: [],
          hidePanelTitles: true,
          id,
          // query: { query: '', language: 'kuery' },
          refreshConfig: { value: 0, pause: true },
          timeRange: {
            from: '2019-05-19T20:00:00.000Z',
            to: '2019-05-19T20:30:00.000Z',
          },
          viewMode: ViewMode.VIEW,
          isLayerTOCOpen: false,
          openTOCDetails: [],
        }
      );

      setEmbeddable(embeddableObject);
      setIsLoading(false);
    } catch (e) {
      console.log('Error loading embeddable from saved object: ', e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const updateGlobalFiltersAction = new UpdateGlobalFilterAction();
    start.registerAction(updateGlobalFiltersAction);
    start.attachAction(APPLY_FILTER_TRIGGER, updateGlobalFiltersAction.id);
    loadSavedObject('822cd0f0-ce7c-419d-aeaa-1171cf452745');
  }, []);

  useEffect(() => {
    console.log('useEffect:filterQuery');
    if (embeddable != null && filterQuery != null) {
      if (embeddable._dispatchSetQuery != null) {
        const query = { query: filterQuery, language: 'kuery' };
        embeddable.updateInput({ query });
      }
    }
  }, [filterQuery]);

  useEffect(() => {
    console.log('useEffect:startDate', startDate);
    console.log('useEffect:endDate', endDate);
    if (embeddable != null && startDate != null && endDate != null) {
      if (embeddable._dispatchSetQuery != null) {
        const timeRange = {
          from: new Date(startDate).toISOString(),
          to: new Date(endDate).toISOString(),
        };
        embeddable.updateInput({ timeRange });
      }
    }
  }, [startDate, endDate]);
  return (
    <>
      <EmbeddableWrapper>
        {embeddable != null ? (
          <EmbeddablePanel
            embeddable={embeddable}
            getActions={start.getTriggerCompatibleActions}
            getEmbeddableFactory={start.getEmbeddableFactory}
            getAllEmbeddableFactories={start.getEmbeddableFactories}
            notifications={npStart.core.notifications}
            overlays={npStart.core.overlays}
            inspector={npStart.plugins.inspector}
            SavedObjectFinder={SavedObjectFinder}
          />
        ) : (
          <Loader data-test-subj="pewpew-loading-panel" overlay size="xl" />
        )}
      </EmbeddableWrapper>
      <EuiSpacer />
    </>
  );
});

SavedMap.displayName = 'SavedMap';
