/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
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
  /** Rendered as a callout above the catalogue, e.g. "send to the Ingest API instead". */
  calloutAction?: { label: string; text: string; onClick: () => void };
  /** Header escape hatch, e.g. "Your integrations" -> the installed integrations page. */
  headerAction?: { label: string; onClick: () => void };
  /** Opens the catalogue pre-filtered. */
  initialSearch?: string;
  initialCategories?: string[];
  prereleaseIntegrationsEnabled?: boolean;
}

// The catalogue drives its filter state through the URL (path category, query params). A memory
// router absorbs every push/replace so the filters keep working without touching the host's URL.
const CATALOGUE_ROUTE = '/browse/:category?/:subcategory?';

function buildInitialEntry(initialSearch?: string, initialCategories?: string[]) {
  const params = new URLSearchParams();
  if (initialSearch) {
    params.set('q', initialSearch);
  }
  initialCategories?.filter(Boolean).forEach((category) => params.append('category', category));
  const search = params.toString();
  return search ? `/browse?${search}` : '/browse';
}

export function AddIntegrationModal({
  onClose,
  onIntegrationSelected,
  title,
  subtitle,
  calloutAction,
  headerAction,
  initialSearch,
  initialCategories,
  prereleaseIntegrationsEnabled = false,
}: AddIntegrationModalProps) {
  const { core, deps, kibanaVersion } = getStartServices();
  const titleId = useGeneratedHtmlId({ prefix: 'ingestHubAddIntegrationModalTitle' });
  const queryClient = useMemo(() => new QueryClient(), []);
  const initialEntry = useMemo(
    () => buildInitialEntry(initialSearch, initialCategories),
    [initialSearch, initialCategories]
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={false}
      css={{ inlineSize: '90vw', blockSize: '85vh' }}
      data-test-subj="ingestHubAddIntegrationModal"
    >
      <EuiModalHeader>
        <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
          <EuiFlexItem>
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
          </EuiFlexItem>
          {headerAction && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="external"
                iconSide="right"
                onClick={headerAction.onClick}
                data-test-subj="ingestHubAddIntegrationModalHeaderAction"
              >
                {headerAction.label}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        {calloutAction && (
          <>
            <EuiPanel hasShadow={false} hasBorder paddingSize="s">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiText size="s">{calloutAction.text}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    flush="both"
                    onClick={calloutAction.onClick}
                    data-test-subj="ingestHubAddIntegrationModalCalloutAction"
                  >
                    {calloutAction.label}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="m" />
          </>
        )}
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
                    <MemoryRouter initialEntries={[initialEntry]}>
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
