/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiLoadingSpinner,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MemoryRouter, Route, Routes } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  FleetStatusProvider,
  FlyoutContextProvider,
  KibanaVersionContext,
  LazyBrowseIntegrationsPage,
} from '@kbn/fleet-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { getStartServices } from '../services/start_services';

export interface AddIntegrationModalProps {
  onClose: () => void;
  /** Called when an integration card is clicked, instead of navigating to Fleet. */
  onIntegrationSelected?: (card: IntegrationCardItem) => void;
  /** "Add data" in Streams, "Add integration" elsewhere. */
  title?: string;
  subtitle?: string;
  prereleaseIntegrationsEnabled?: boolean;
}

// The catalogue drives its filter state through the URL (path category, query params). A memory
// router absorbs every push/replace so the filters keep working without touching the host's URL.
const CATALOGUE_ROUTE = '/browse/:category?/:subcategory?';
const CATALOGUE_ENTRY = '/browse';

export function AddIntegrationModal({
  onClose,
  onIntegrationSelected,
  title,
  subtitle,
  prereleaseIntegrationsEnabled = false,
}: AddIntegrationModalProps) {
  const { core, deps, kibanaVersion } = getStartServices();
  const titleId = useGeneratedHtmlId({ prefix: 'ingestHubAddIntegrationModalTitle' });
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={false}
      css={{ inlineSize: '90vw', blockSize: '85vh' }}
      data-test-subj="ingestHubAddIntegrationModal"
    >
      <EuiModalHeader>
        <div>
          <EuiModalHeaderTitle id={titleId}>
            {title ??
              i18n.translate('xpack.ingestHub.addIntegrationModal.title', {
                defaultMessage: 'Add integration',
              })}
          </EuiModalHeaderTitle>
          {subtitle && (
            <EuiText size="s" color="subdued">
              {subtitle}
            </EuiText>
          )}
        </div>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiThemeProvider>
          <KibanaContextProvider
            services={{
              ...core,
              cloud: deps.cloud,
              fleet: deps.fleet,
              spaces: deps.spaces,
              authz: deps.fleet.authz,
            }}
          >
            <QueryClientProvider client={queryClient}>
              <FleetStatusProvider>
                <FlyoutContextProvider>
                  <KibanaVersionContext.Provider value={kibanaVersion}>
                    <MemoryRouter initialEntries={[CATALOGUE_ENTRY]}>
                      <Routes>
                        <Route path={CATALOGUE_ROUTE}>
                          <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                            <LazyBrowseIntegrationsPage
                              prereleaseIntegrationsEnabled={prereleaseIntegrationsEnabled}
                              embedded
                              onIntegrationSelected={onIntegrationSelected}
                            />
                          </Suspense>
                        </Route>
                      </Routes>
                    </MemoryRouter>
                  </KibanaVersionContext.Provider>
                </FlyoutContextProvider>
              </FleetStatusProvider>
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiThemeProvider>
      </EuiModalBody>
    </EuiModal>
  );
}
