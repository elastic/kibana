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
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import {
  EmbeddableInput,
  EmbeddablePanel,
  ViewMode,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';
import { Loader } from '../loader';
import { SET_IS_LAYER_TOC_OPEN } from '../../../../maps/public/actions/map_actions';
import { useEffect } from 'react';
import { useState } from 'react';

interface SavedMapInput extends EmbeddableInput {
  id: string;
  timeRange?: TimeRange;
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  filters: Filter[];
}

const EmbeddableWrapper = styled(EuiFlexGroup)`
  position: relative;
  height: 400px;
  margin: 0;
`;
export const SavedMap = React.memo(() => {
  const [embeddable, setEmbeddable] = React.useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
          timeRange: { from: '2017-10-01T20:20:36.275Z', to: '2019-02-04T21:20:55.548Z' },
          viewMode: ViewMode.VIEW,
          isLayerTOCOpen: false,
          openTOCDetails: [],
        }
      );

      setEmbeddable(embeddableObject);
      setIsLoading(false);
      // start.executeTriggerActions(SET_IS_LAYER_TOC_OPEN, {
      //   embeddable,
      //   type: SET_IS_LAYER_TOC_OPEN,
      //   triggerContext: { isLayerTOCOpen: false },
      // });
    } catch (e) {
      console.log('Error loading embeddable from saved object: ', e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadSavedObject('822cd0f0-ce7c-419d-aeaa-1171cf452745');
  }, []);
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
