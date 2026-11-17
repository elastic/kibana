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
import { FleetStatusProvider } from '../../hooks/use_fleet_status';
import { FlyoutContextProvider } from '../../hooks/use_flyout_context';
import { KibanaVersionContext } from '../../hooks/use_kibana_version';
import { getStartServices } from '../../services/start_services';
import { BrowseIntegrationsPage } from '../../applications/integrations/sections/epm/screens/browse_integrations';
import type { IntegrationCardItem } from '../../applications/integrations/sections/epm/screens/home';

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
  const { core, fleet, cloud, spaces, kibanaVersion } = getStartServices();
  const titleId = useGeneratedHtmlId({ prefix: 'fleetAddIntegrationModalTitle' });
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={false}
      css={{ inlineSize: '90vw', blockSize: '85vh' }}
      data-test-subj="fleetAddIntegrationModal"
    >
      <EuiModalHeader>
        <div>
          <EuiModalHeaderTitle id={titleId}>
            {title ??
              i18n.translate('xpack.fleet.addIntegrationModal.title', {
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
              cloud,
              fleet,
              spaces,
              authz: fleet.authz,
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
                            <BrowseIntegrationsPage
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
