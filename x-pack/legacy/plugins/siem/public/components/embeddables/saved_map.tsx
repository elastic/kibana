/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { npStart } from 'ui/new_platform';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';
import uuid from 'uuid';

import styled from 'styled-components';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import {
  APPLY_FILTER_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  EmbeddablePanel,
  PANEL_BADGE_TRIGGER,
  ViewMode,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';
import { Loader } from '../loader';
import { ESQuery } from '../../../common/typed_json';
import {
  UPDATE_GLOBAL_FILTER_ACTION_ID,
  UpdateGlobalFilterAction,
} from './update_global_filter_action';
import { useIndexPatterns } from '../ml_popover/hooks/use_index_patterns';
import { getLayerListJSONString } from './map_config';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { getIndexPatternTitleIdMapping } from '../ml_popover/helpers';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';

const EmbeddableWrapper = styled(EuiFlexGroup)`
  position: relative;
  height: 400px;
  margin: 0;
`;

export interface SavedMapProps {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQuery?: ESQuery | string;
  startDate?: number;
  endDate?: number;
}

export const SavedMap = React.memo<SavedMapProps>(
  ({ applyFilterQueryFromKueryExpression, filterQuery, startDate, endDate }) => {
    const [embeddable, setEmbeddable] = React.useState(null);
    const [, configuredIndexPatterns] = useIndexPatterns();
    const [, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [siemDefaultIndices] = useKibanaUiSetting(DEFAULT_INDEX_KEY);

    const loadEmbeddable = async (
      id: string,
      indexPatterns: Array<{ title: string; id: string }>
    ) => {
      try {
        const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

        const state = {
          layerList: getLayerListJSONString(indexPatterns),
          title: 'panel title',
        };
        const input = {
          filters: [],
          hidePanelTitles: true,
          id,
          query: { query: '', language: 'kuery' },
          refreshConfig: { value: 0, pause: true },
          timeRange: {
            from: '2019-05-19T20:00:00.000Z',
            to: '2019-05-19T20:30:00.000Z',
          },
          viewMode: ViewMode.VIEW,
          isLayerTOCOpen: false,
          openTOCDetails: [],
          hideFilterActions: false,
          mapCenter: { lon: -70.64316, lat: 34.0006, zoom: 3.1 },
        };

        // @ts-ignore method added in https://github.com/elastic/kibana/pull/43878
        const embeddableObject = await factory.createFromState(state, input);

        setEmbeddable(embeddableObject);
        setIsLoading(false);
      } catch (e) {
        // TODO: Throw toast
        setIsLoading(false);
      }
    };

    const setupEmbeddablesAPI = () => {
      let actionLoaded = false;
      try {
        const actions = start.getTriggerActions(APPLY_FILTER_TRIGGER);
        actionLoaded =
          actions.length > 0 && actions.some(a => a.id === UPDATE_GLOBAL_FILTER_ACTION_ID);
      } catch (e) {
        actionLoaded = false;
      }

      if (!actionLoaded) {
        const updateGlobalFiltersAction = new UpdateGlobalFilterAction({
          applyFilterQueryFromKueryExpression,
        });
        start.registerAction(updateGlobalFiltersAction);
        start.attachAction(APPLY_FILTER_TRIGGER, updateGlobalFiltersAction.id);
        start.detachAction(CONTEXT_MENU_TRIGGER, 'CUSTOM_TIME_RANGE');
        start.detachAction(PANEL_BADGE_TRIGGER, 'CUSTOM_TIME_RANGE_BADGE');
      }
    };

    // Initial Load useEffect
    useEffect(() => {
      setIsLoading(true);

      const importIfNotExists = async () => {
        // TODO: Can ip.attributes && ip.attributes.title be null?
        const matchingIndexPatterns = configuredIndexPatterns.filter(ip =>
          siemDefaultIndices.includes(ip.attributes.title)
        );

        // Ensure at least one siem:defaultIndex index pattern exists before trying to import
        if (matchingIndexPatterns.length === 0) {
          setIsError(true);
          return;
        }

        setupEmbeddablesAPI();
        await loadEmbeddable(uuid.v4(), getIndexPatternTitleIdMapping(matchingIndexPatterns));
      };

      if (configuredIndexPatterns.length > 0) {
        importIfNotExists();
      }
    }, [configuredIndexPatterns]);

    // FilterQuery updated useEffect
    useEffect(() => {
      if (embeddable != null && filterQuery != null) {
        const query = { query: filterQuery, language: 'kuery' };
        embeddable.updateInput({ query });
      }
    }, [filterQuery]);

    // DateRange updated useEffect
    useEffect(() => {
      if (embeddable != null && startDate != null && endDate != null) {
        const timeRange = {
          from: new Date(startDate).toISOString(),
          to: new Date(endDate).toISOString(),
        };
        embeddable.updateInput({ timeRange });
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
          ) : isError ? (
            <IndexPatternsMissingPrompt
              indexPatterns={
                siemDefaultIndices ? siemDefaultIndices.join(', ') : 'No indices specified'
              }
            />
          ) : (
            <Loader data-test-subj="pewpew-loading-panel" overlay size="xl" />
          )}
        </EmbeddableWrapper>
        <EuiSpacer />
      </>
    );
  }
);

SavedMap.displayName = 'SavedMap';
