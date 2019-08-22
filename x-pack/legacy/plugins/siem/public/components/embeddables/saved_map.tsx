/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { npStart } from 'ui/new_platform';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

import styled from 'styled-components';
import { TimeRange } from 'ui/timefilter';
import chrome from 'ui/chrome';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import {
  APPLY_FILTER_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  EmbeddableInput,
  EmbeddablePanel,
  PANEL_BADGE_TRIGGER,
  ViewMode,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import * as i18n from './translations';

import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';
import { Loader } from '../loader';
import { ESQuery } from '../../../common/typed_json';
import {
  UPDATE_GLOBAL_FILTER_ACTION_ID,
  UpdateGlobalFilterAction,
} from './update_global_filter_action';
import { importSavedObject, savedObjectExists } from './api';
import { useIndexPatterns } from '../ml_popover/hooks/use_index_patterns';
import { MAP_SAVED_OBJECT } from './saved_objects/saved_objects';

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
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQuery?: ESQuery | string;
  startDate?: number;
  endDate?: number;
}

const REQUIRED_INDEX_PATTERNS = ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'];

export const SavedMap = React.memo<SavedMapProps>(
  ({ applyFilterQueryFromKueryExpression, filterQuery, startDate, endDate }) => {
    const [embeddable, setEmbeddable] = React.useState(null);
    const [, configuredIndexPatterns] = useIndexPatterns();
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const loadSavedObject = async (id: string) => {
      try {
        const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);
        const embeddableObject = await factory.createFromSavedObject(id, {
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
          hideFilterActions: true,
        });

        setEmbeddable(embeddableObject);
        setIsLoading(false);
      } catch (e) {
        console.log('Error loading embeddable from saved object: ', e);
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
        if (!(await savedObjectExists(MAP_SAVED_OBJECT_TYPE, MAP_SAVED_OBJECT.id))) {
          // Check if required index patterns even exist before trying to import
          if (REQUIRED_INDEX_PATTERNS.every(ip => configuredIndexPatterns.includes(ip))) {
            console.log('Map Saved Object does not exist. Importing...');
            const importResponse = await importSavedObject();
            console.log('importResponse:', importResponse);
          } else {
            // Show missing index patterns error
            setIsError(true);
            return;
          }
        }

        setupEmbeddablesAPI();
        loadSavedObject(MAP_SAVED_OBJECT.id);
      };

      if (configuredIndexPatterns.length > 0) {
        importIfNotExists();
      }
    }, [configuredIndexPatterns]);

    // FilterQuery updated useEffect
    useEffect(() => {
      console.log('useEffect:filterQuery');
      if (embeddable != null && filterQuery != null) {
        const query = { query: filterQuery, language: 'kuery' };
        console.log('updating input with query: ', query);
        embeddable.updateInput({ query });
      }
    }, [filterQuery]);

    // DateRange updated useEffect
    useEffect(() => {
      console.log('useEffect:startDate', startDate);
      console.log('useEffect:endDate', endDate);
      if (embeddable != null && startDate != null && endDate != null) {
        const timeRange = {
          from: new Date(startDate).toISOString(),
          to: new Date(endDate).toISOString(),
        };
        console.log('updating input with timeRange: ', timeRange);
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
              indexPatterns={configuredIndexPatterns}
              onChange={() => {}}
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

const IndexPatternsMissingPrompt = React.memo<>(() => {
  return (
    <EuiEmptyPrompt
      iconType="gisApp"
      title={<h2>{i18n.ERROR_TITLE}</h2>}
      titleSize="xs"
      body={
        <>
          <p>{i18n.ERROR_DESCRIPTION}</p>
          <p>{i18n.ERROR_INDEX_PATTERNS}</p>
        </>
      }
      actions={
        <EuiButton
          href={`${chrome.getBasePath()}/app/kibana#/management/kibana/index_patterns`}
          color="primary"
          target="_blank"
          isDisabled={selectedOptions.length === 0}
          fill
        >
          {i18n.ERROR_BUTTON}
        </EuiButton>
      }
    />
  );
});
