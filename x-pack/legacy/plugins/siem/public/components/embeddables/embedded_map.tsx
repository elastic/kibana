/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { npStart } from 'ui/new_platform';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

import styled from 'styled-components';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { EmbeddablePanel } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import { Loader } from '../loader';
import { useIndexPatterns } from '../ml_popover/hooks/use_index_patterns';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { getIndexPatternTitleIdMapping } from '../ml_popover/helpers';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import { MapEmbeddable, SetQuery } from './types';
import * as i18n from './translations';
import { useStateToaster } from '../toasters';
import { createEmbeddable, displayErrorToast, setupEmbeddablesAPI } from './embedded_map_helpers';

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
  setQuery: SetQuery;
}

export const EmbeddedMap = React.memo<EmbeddedMapProps>(
  ({ applyFilterQueryFromKueryExpression, endDate, queryExpression, setQuery, startDate }) => {
    const [embeddable, setEmbeddable] = React.useState<MapEmbeddable | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isIndexError, setIsIndexError] = useState(false);

    const [, dispatchToaster] = useStateToaster();
    const [loadingKibanaIndexPatterns, kibanaIndexPatterns] = useIndexPatterns();
    const [siemDefaultIndices] = useKibanaUiSetting(DEFAULT_INDEX_KEY);

    // Initial Load useEffect
    useEffect(() => {
      let isSubscribed = true;
      async function setupEmbeddable() {
        // Configure Embeddables API
        try {
          setupEmbeddablesAPI(applyFilterQueryFromKueryExpression);
        } catch (e) {
          displayErrorToast(i18n.ERROR_CONFIGURING_EMBEDDABLES_API, e.message, dispatchToaster);
          setIsLoading(false);
          setIsError(true);
          return false;
        }

        // Ensure at least one `siem:defaultIndex` index pattern exists before trying to import
        const matchingIndexPatterns = kibanaIndexPatterns.filter(ip =>
          siemDefaultIndices.includes(ip.attributes.title)
        );
        if (matchingIndexPatterns.length === 0 && isSubscribed) {
          setIsLoading(false);
          setIsIndexError(true);
          return;
        }

        // Create & set Embeddable
        try {
          const embeddableObject = await createEmbeddable(
            getIndexPatternTitleIdMapping(matchingIndexPatterns),
            queryExpression,
            startDate,
            endDate,
            setQuery
          );
          if (isSubscribed) {
            setEmbeddable(embeddableObject);
          }
        } catch (e) {
          if (isSubscribed) {
            displayErrorToast(i18n.ERROR_CREATING_EMBEDDABLE, e.message, dispatchToaster);
            setIsError(true);
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }

      if (!loadingKibanaIndexPatterns) {
        setupEmbeddable();
      }
      return () => {
        isSubscribed = false;
      };
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

    return isError ? null : (
      <>
        <EmbeddableWrapper>
          {embeddable != null ? (
            <EmbeddablePanel
              data-test-subj="embeddable-panel"
              embeddable={embeddable}
              getActions={npStart.plugins.uiActions.getTriggerCompatibleActions}
              getEmbeddableFactory={start.getEmbeddableFactory}
              getAllEmbeddableFactories={start.getEmbeddableFactories}
              notifications={npStart.core.notifications}
              overlays={npStart.core.overlays}
              inspector={npStart.plugins.inspector}
              SavedObjectFinder={SavedObjectFinder}
            />
          ) : !isLoading && isIndexError ? (
            <IndexPatternsMissingPrompt data-test-subj="missing-prompt" />
          ) : (
            <Loader data-test-subj="loading-panel" overlay size="xl" />
          )}
        </EmbeddableWrapper>
        <EuiSpacer />
      </>
    );
  }
);

EmbeddedMap.displayName = 'EmbeddedMap';
