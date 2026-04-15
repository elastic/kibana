/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { getNewPath, setBreadcrumbs } from '../services/url';
import type { GraphServices } from '../application';
import { GraphContentList } from '../components/content_list';

export interface ListingRouteProps {
  deps: Omit<GraphServices, 'savedObjects'>;
}

export function ListingRoute({
  deps: { chrome, contentClient, coreStart, capabilities, addBasePath, uiSettings },
}: ListingRouteProps) {
  const history = useHistory();
  const query = new URLSearchParams(useLocation().search);
  const initialFilter = query.get('filter') || '';

  useEffect(() => {
    setBreadcrumbs({ chrome });
  }, [chrome]);

  const onCreateGraph = useCallback(() => {
    history.push(getNewPath());
  }, [history]);

  const canSave = !!capabilities.graph.save;
  const canDelete = !!capabilities.graph.delete;

  const title = i18n.translate('xpack.graph.listing.graphsTitle', {
    defaultMessage: 'Graphs',
  });

  const sampleDataUrl = coreStart.application.getUrlForApp('home', {
    path: '#/tutorial_directory/sampleData',
  });

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header
        pageTitle={<span id="graphListingHeading">{title}</span>}
        rightSideItems={
          canSave
            ? [
                <EuiButton
                  key="create"
                  onClick={onCreateGraph}
                  fill
                  iconType="plusCircle"
                  data-test-subj="newItemButton"
                >
                  <FormattedMessage
                    id="xpack.graph.listing.createNewGraph.createButtonLabel"
                    defaultMessage="Create graph"
                  />
                </EuiButton>,
              ]
            : undefined
        }
        data-test-subj="top-nav"
      />
      <KibanaPageTemplate.Section aria-labelledby="graphListingHeading">
        <GraphContentList
          {...{
            addBasePath,
            canDelete,
            canSave,
            contentClient,
            initialFilter,
            sampleDataUrl,
            title,
            uiSettings,
            onCreateGraph,
          }}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
}
