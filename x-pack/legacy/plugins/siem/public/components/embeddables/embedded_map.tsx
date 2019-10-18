/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import React, { useEffect, useState } from 'react';
import { npStart } from 'ui/new_platform';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';
import { createPortalNode, InPortal } from 'react-reverse-portal';
import { Query } from 'src/plugins/data/common';

import styled from 'styled-components';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { EmbeddablePanel } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';

import { Loader } from '../loader';
import { useIndexPatterns } from '../../hooks/use_index_patterns';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import { MapEmbeddable, SetQuery } from './types';
import * as i18n from './translations';
import { useStateToaster } from '../toasters';
import { createEmbeddable, displayErrorToast, setupEmbeddablesAPI } from './embedded_map_helpers';
import { MapToolTip } from './map_tool_tip/map_tool_tip';
import { getIndexPatternTitleIdMapping } from '../../hooks/api/helpers';

const EmbeddableWrapper = styled(EuiFlexGroup)`
  position: relative;
  height: 400px;
  margin: 0;

  .mapToolbarOverlay__button {
    display: none;
  }
`;

export interface EmbeddedMapProps {
  query: Query;
  filters: Filter[];
  startDate: number;
  endDate: number;
  setQuery: SetQuery;
}

export const EmbeddedMap = React.memo<EmbeddedMapProps>(
  ({ endDate, filters, query, setQuery, startDate }) => {
    const [embeddable, setEmbeddable] = React.useState<MapEmbeddable | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isIndexError, setIsIndexError] = useState(false);

    const [, dispatchToaster] = useStateToaster();
    const [loadingKibanaIndexPatterns, kibanaIndexPatterns] = useIndexPatterns();
    const [siemDefaultIndices] = useKibanaUiSetting(DEFAULT_INDEX_KEY);

    // This portalNode provided by react-reverse-portal allows us re-parent the MapToolTip within our
    // own component tree instead of the embeddables (default). This is necessary to have access to
    // the Redux store, theme provider, etc, which is required to register and un-register the draggable
    // Search InPortal/OutPortal for implementation touch points
    const portalNode = React.useMemo(() => createPortalNode(), []);

    // Initial Load useEffect
    useEffect(() => {
      let isSubscribed = true;
      async function setupEmbeddable() {
        // Configure Embeddables API
        try {
          setupEmbeddablesAPI();
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
            filters,
            getIndexPatternTitleIdMapping(matchingIndexPatterns),
            query,
            startDate,
            endDate,
            setQuery,
            portalNode
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
      if (embeddable != null) {
        embeddable.updateInput({ query });
      }
    }, [query]);

    useEffect(() => {
      if (embeddable != null) {
        embeddable.updateInput({ filters });
      }
    }, [filters]);

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
        <InPortal node={portalNode}>
          <MapToolTip />
        </InPortal>
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
