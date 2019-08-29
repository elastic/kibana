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
  APPLY_FILTER_ACTION,
  APPLY_FILTER_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  EmbeddablePanel,
  PANEL_BADGE_TRIGGER,
  ViewMode,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';
import { Loader } from '../loader';
import {
  APPLY_SIEM_FILTER_ACTION_ID,
  ApplySiemFilterAction,
} from './actions/apply_siem_filter_action';
import { useIndexPatterns } from '../ml_popover/hooks/use_index_patterns';
import { getLayerList } from './map_config';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { getIndexPatternTitleIdMapping } from '../ml_popover/helpers';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import {
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/embeddables';
import { IndexPatternMapping, MapEmbeddableInput } from './types';
import * as i18n from './translations';
import { inputsModel } from '../../store/inputs';

// Used for setQuery to get a hook for when the user requests a refresh. Scope to page type if using map elsewhere
const ID = 'embeddedMap';

const EmbeddableWrapper = styled(EuiFlexGroup)`
  position: relative;
  height: 400px;
  margin: 0;

  .mapToolbarOverlay__button {
    display: none;
  }
`;

export interface EmbeddedMapProps {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  queryExpression: string;
  startDate: number;
  endDate: number;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
}

export const EmbeddedMap = React.memo<EmbeddedMapProps>(
  ({ applyFilterQueryFromKueryExpression, queryExpression, startDate, endDate, setQuery }) => {
    const [embeddable, setEmbeddable] = React.useState<IEmbeddable<
      MapEmbeddableInput,
      EmbeddableOutput
    > | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const [loadingKibanaIndexPatterns, kibanaIndexPatterns] = useIndexPatterns();
    const [siemDefaultIndices] = useKibanaUiSetting(DEFAULT_INDEX_KEY);

    const loadEmbeddable = async (id: string, indexPatterns: IndexPatternMapping[]) => {
      try {
        const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

        const state = {
          layerList: getLayerList(indexPatterns),
          title: i18n.MAP_TITLE,
        };
        const input = {
          id,
          filters: [],
          hidePanelTitles: true,
          query: { query: queryExpression, language: 'kuery' },
          refreshConfig: { value: 0, pause: true },
          timeRange: {
            from: new Date(startDate).toISOString(),
            to: new Date(endDate).toISOString(),
          },
          viewMode: ViewMode.VIEW,
          isLayerTOCOpen: false,
          openTOCDetails: [],
          hideFilterActions: false,
          mapCenter: { lon: -1.05469, lat: 15.96133, zoom: 1 },
        };

        // @ts-ignore method added in https://github.com/elastic/kibana/pull/43878
        const embeddableObject = await factory.createFromState(state, input);

        // Wire up to app refresh action
        setQuery({
          id: ID,
          inspect: null,
          loading: false,
          refetch: embeddableObject.reload,
        });

        setEmbeddable(embeddableObject);
      } catch (e) {
        // TODO: Throw toast https://github.com/elastic/siem-team/issues/449
      }
    };

    /**
     * Temporary Embeddables API configuration override until ability to edit actions is addressed:
     * https://github.com/elastic/kibana/issues/43643
     */
    const setupEmbeddablesAPI = (): boolean => {
      try {
        const actions = start.getTriggerActions(APPLY_FILTER_TRIGGER);
        const actionLoaded = actions.some(a => a.id === APPLY_SIEM_FILTER_ACTION_ID);
        if (!actionLoaded) {
          const siemFilterAction = new ApplySiemFilterAction({
            applyFilterQueryFromKueryExpression,
          });
          start.registerAction(siemFilterAction);
          start.attachAction(APPLY_FILTER_TRIGGER, siemFilterAction.id);

          start.detachAction(CONTEXT_MENU_TRIGGER, 'CUSTOM_TIME_RANGE');
          start.detachAction(PANEL_BADGE_TRIGGER, 'CUSTOM_TIME_RANGE_BADGE');
          start.detachAction(APPLY_FILTER_TRIGGER, APPLY_FILTER_ACTION);
        }
        return true;
      } catch (e) {
        // TODO: Throw toast https://github.com/elastic/siem-team/issues/449
        return false;
      }
    };

    // Initial Load useEffect
    useEffect(() => {
      setIsLoading(true);

      const importIfNotExists = async () => {
        const matchingIndexPatterns = kibanaIndexPatterns.filter(ip =>
          siemDefaultIndices.includes(ip.attributes.title)
        );

        const setupSuccessfully = setupEmbeddablesAPI();

        // Ensure at least one `siem:defaultIndex` index pattern exists before trying to import
        if (matchingIndexPatterns.length === 0 || !setupSuccessfully) {
          setIsLoading(false);
          setIsError(true);
          return;
        }

        await loadEmbeddable(uuid.v4(), getIndexPatternTitleIdMapping(matchingIndexPatterns));
        setIsLoading(false);
      };

      if (!loadingKibanaIndexPatterns && kibanaIndexPatterns.length > 0) {
        importIfNotExists();
      }
    }, [loadingKibanaIndexPatterns, kibanaIndexPatterns]);

    // queryExpression updated useEffect
    useEffect(() => {
      if (embeddable != null && queryExpression != null) {
        const query = { query: queryExpression, language: 'kuery' };
        embeddable.updateInput({ query });
      }
    }, [queryExpression]);

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
          ) : !isLoading && isError ? (
            <IndexPatternsMissingPrompt />
          ) : (
            <Loader data-test-subj="pewpew-loading-panel" overlay size="xl" />
          )}
        </EmbeddableWrapper>
        <EuiSpacer />
      </>
    );
  }
);

EmbeddedMap.displayName = 'EmbeddedMap';
