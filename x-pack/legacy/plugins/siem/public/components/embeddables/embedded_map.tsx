/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { createPortalNode, InPortal } from 'react-reverse-portal';
import styled, { css } from 'styled-components';

import { EmbeddablePanel } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { getIndexPatternTitleIdMapping } from '../../hooks/api/helpers';
import { useIndexPatterns } from '../../hooks/use_index_patterns';
import { useKibanaCore } from '../../lib/compose/kibana_core';
import { useKibanaPlugins } from '../../lib/compose/kibana_plugins';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { Loader } from '../loader';
import { useStateToaster } from '../toasters';
import { Embeddable } from './embeddable';
import { EmbeddableHeader } from './embeddable_header';
import { createEmbeddable, displayErrorToast } from './embedded_map_helpers';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import { MapToolTip } from './map_tool_tip/map_tool_tip';
import * as i18n from './translations';
import { MapEmbeddable, SetQuery } from './types';
import { Query, esFilters } from '../../../../../../../src/plugins/data/public';
import {
  SavedObjectFinderProps,
  SavedObjectFinderUi,
} from '../../../../../../../src/plugins/kibana_react/public';

interface EmbeddableMapProps {
  maintainRatio?: boolean;
}

const EmbeddableMap = styled.div.attrs(() => ({
  className: 'siemEmbeddable__map',
}))<EmbeddableMapProps>`
  .embPanel {
    border: none;
    box-shadow: none;
  }

  .mapToolbarOverlay__button {
    display: none;
  }

  ${({ maintainRatio }) =>
    maintainRatio &&
    css`
      padding-top: calc(3 / 4 * 100%); /* 4:3 (standard) ratio */
      position: relative;

      @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.m}) {
        padding-top: calc(9 / 32 * 100%); /* 32:9 (ultra widescreen) ratio */
      }

      @media only screen and (min-width: 1441px) and (min-height: 901px) {
        padding-top: calc(9 / 21 * 100%); /* 21:9 (ultrawide) ratio */
      }

      .embPanel {
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
    `}
`;
EmbeddableMap.displayName = 'EmbeddableMap';

export interface EmbeddedMapProps {
  query: Query;
  filters: esFilters.Filter[];
  startDate: number;
  endDate: number;
  setQuery: SetQuery;
}

export const EmbeddedMapComponent = ({
  endDate,
  filters,
  query,
  setQuery,
  startDate,
}: EmbeddedMapProps) => {
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

  const plugins = useKibanaPlugins();
  const core = useKibanaCore();

  // Initial Load useEffect
  useEffect(() => {
    let isSubscribed = true;
    async function setupEmbeddable() {
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
          portalNode,
          plugins.embeddable
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

  const SavedObjectFinder = (props: SavedObjectFinderProps) => (
    <SavedObjectFinderUi {...props} savedObjects={core.savedObjects} uiSettings={core.uiSettings} />
  );

  return isError ? null : (
    <Embeddable>
      <EmbeddableHeader title={i18n.EMBEDDABLE_HEADER_TITLE}>
        <EuiText size="xs">
          <EuiLink
            href={`${core.docLinks.ELASTIC_WEBSITE_URL}guide/en/siem/guide/${core.docLinks.DOC_LINK_VERSION}/conf-map-ui.html`}
            target="_blank"
          >
            {i18n.EMBEDDABLE_HEADER_HELP}
          </EuiLink>
        </EuiText>
      </EmbeddableHeader>

      <InPortal node={portalNode}>
        <MapToolTip />
      </InPortal>

      <EmbeddableMap maintainRatio={!isIndexError}>
        {embeddable != null ? (
          <EmbeddablePanel
            data-test-subj="embeddable-panel"
            embeddable={embeddable}
            getActions={plugins.uiActions.getTriggerCompatibleActions}
            getEmbeddableFactory={start.getEmbeddableFactory}
            getAllEmbeddableFactories={start.getEmbeddableFactories}
            notifications={core.notifications}
            overlays={core.overlays}
            inspector={plugins.inspector}
            SavedObjectFinder={SavedObjectFinder}
          />
        ) : !isLoading && isIndexError ? (
          <IndexPatternsMissingPrompt data-test-subj="missing-prompt" />
        ) : (
          <Loader data-test-subj="loading-panel" overlay size="xl" />
        )}
      </EmbeddableMap>
    </Embeddable>
  );
};

EmbeddedMapComponent.displayName = 'EmbeddedMapComponent';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);

EmbeddedMap.displayName = 'EmbeddedMap';
