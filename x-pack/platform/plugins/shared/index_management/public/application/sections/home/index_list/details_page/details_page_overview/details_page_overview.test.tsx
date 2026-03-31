/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import type { Index } from '../../../../../../../common';
import { DetailsPageOverview } from './details_page_overview';
import {
  setupEnvironment,
  WithAppDependencies,
} from '../../../../../../../__jest__/client_integration/helpers/setup_environment';
import {
  testIndexMock,
  testIndexName,
  testIndexMappings,
  testUserStartPrivilegesResponse,
} from '../../../../../../../__jest__/client_integration/index_details_page/mocks';

jest.mock('@kbn/code-editor');

const mockUseCloudConnectStatus = jest.fn();
jest.mock('@kbn/search-api-panels', () => ({
  ...jest.requireActual('@kbn/search-api-panels'),
  useCloudConnectStatus: (...args: unknown[]) => mockUseCloudConnectStatus(...args),
  EisCloudConnectPromoCallout: (props: { promoId: string }) => (
    <div data-test-subj={`${props.promoId}-cloud-connect-callout`}>Cloud Connect Promo</div>
  ),
  EisUpdateCallout: (props: { promoId: string; handleOnClick: () => void }) => (
    <div data-test-subj={`${props.promoId}-eis-update-callout`}>
      EIS Update Callout
      <button data-test-subj="eisUpdateCalloutCtaBtn" onClick={props.handleOnClick}>
        Update
      </button>
    </div>
  ),
}));

const mockHasElserOnMlNodeSemanticTextField = jest.fn();
jest.mock('../../../../../components/mappings_editor/lib/utils', () => ({
  ...jest.requireActual('../../../../../components/mappings_editor/lib/utils'),
  hasElserOnMlNodeSemanticTextField: (...args: unknown[]) =>
    mockHasElserOnMlNodeSemanticTextField(...args),
}));

jest.mock('../update_elser_mappings/update_elser_mappings_modal', () => ({
  UpdateElserMappingsModal: (props: { indexName: string }) => (
    <div data-test-subj="updateElserMappingsModal">Update ELSER Mappings for {props.indexName}</div>
  ),
}));

describe('DetailsPageOverview', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    jest.clearAllMocks();
    const mockEnvironment = setupEnvironment();
    ({ httpSetup, httpRequestsMockHelpers } = mockEnvironment);

    httpRequestsMockHelpers.setLoadIndexMappingResponse(testIndexName, testIndexMappings);
    httpRequestsMockHelpers.setUserStartPrivilegesResponse(
      testIndexName,
      testUserStartPrivilegesResponse
    );
    httpRequestsMockHelpers.setLoadIndexDocCountResponse({ [testIndexName]: 1 });
    httpRequestsMockHelpers.setInferenceModels([]);

    mockUseCloudConnectStatus.mockReturnValue({
      isLoading: true,
      isCloudConnected: false,
      isCloudConnectedWithEisEnabled: false,
    });
    mockHasElserOnMlNodeSemanticTextField.mockReturnValue(false);
  });

  const renderComponent = (
    overrides: {
      indexDetails?: Index;
      sampleDocuments?: SearchHit[];
      isDocumentsLoading?: boolean;
      documentsError?: unknown;
      appDeps?: Record<string, unknown>;
    } = {}
  ) => {
    const defaultProps = {
      indexDetails: overrides.indexDetails ?? testIndexMock,
      sampleDocuments: overrides.sampleDocuments ?? [],
      isDocumentsLoading: overrides.isDocumentsLoading ?? false,
      documentsError: overrides.documentsError ?? undefined,
    };

    const Comp = WithAppDependencies(() => <DetailsPageOverview {...defaultProps} />, httpSetup, {
      url: { locators: { get: () => ({ navigate: jest.fn(), getUrl: jest.fn() }) } },
      ...overrides.appDeps,
    });

    return render(<Comp />);
  };

  it('renders the QuickStats section', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });
  });

  it('renders the "Add data to this index" heading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Add data to this index')).toBeInTheDocument();
    });
  });

  it('renders the bulk API description with a docs link', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Learn more.')).toBeInTheDocument();
    });
  });

  it('renders code snippet with the index name', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/test_index/)).toBeInTheDocument();
    });
  });

  describe('EisCloudConnectPromoCallout', () => {
    it('does not render when cloud connect status is loading', async () => {
      mockUseCloudConnectStatus.mockReturnValue({
        isLoading: true,
        isCloudConnected: false,
        isCloudConnectedWithEisEnabled: false,
      });

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Add data to this index')).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId('indexDetailsOverview-cloud-connect-callout')
      ).not.toBeInTheDocument();
    });

    it('renders when not loading and not cloud connected', async () => {
      mockUseCloudConnectStatus.mockReturnValue({
        isLoading: false,
        isCloudConnected: false,
        isCloudConnectedWithEisEnabled: false,
      });

      renderComponent();
      await waitFor(() => {
        expect(
          screen.getByTestId('indexDetailsOverview-cloud-connect-callout')
        ).toBeInTheDocument();
      });
    });

    it('does not render when already cloud connected', async () => {
      mockUseCloudConnectStatus.mockReturnValue({
        isLoading: false,
        isCloudConnected: true,
        isCloudConnectedWithEisEnabled: false,
      });

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Add data to this index')).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId('indexDetailsOverview-cloud-connect-callout')
      ).not.toBeInTheDocument();
    });
  });

  describe('EisUpdateCallout', () => {
    it('does not render when there are no ELSER semantic text fields', async () => {
      mockHasElserOnMlNodeSemanticTextField.mockReturnValue(false);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Add data to this index')).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId('indexDetailsOverview-eis-update-callout')
      ).not.toBeInTheDocument();
    });

    it('renders when ELSER semantic text fields are present', async () => {
      mockHasElserOnMlNodeSemanticTextField.mockReturnValue(true);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('indexDetailsOverview-eis-update-callout')).toBeInTheDocument();
      });
    });
  });

  describe('UpdateElserMappingsModal', () => {
    it('does not render by default', async () => {
      mockHasElserOnMlNodeSemanticTextField.mockReturnValue(true);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('indexDetailsOverview-eis-update-callout')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('updateElserMappingsModal')).not.toBeInTheDocument();
    });

    it('renders after clicking the EIS update callout CTA button', async () => {
      mockHasElserOnMlNodeSemanticTextField.mockReturnValue(true);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('eisUpdateCalloutCtaBtn')).toBeInTheDocument();
      });

      screen.getByTestId('eisUpdateCalloutCtaBtn').click();

      await waitFor(() => {
        expect(screen.getByTestId('updateElserMappingsModal')).toBeInTheDocument();
      });
    });
  });
});
