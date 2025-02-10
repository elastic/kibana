/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { TestProvider } from '../../mocks/test_provider';
import { CreateIntegration } from './create_integration';
import { mockServices } from '../../services/mocks/services';
import { useRoutesAuthorization } from '../../common/hooks/use_authorization';
import { useIsAvailable } from '../../common/hooks/use_availability';

jest.mock('../../common/hooks/use_authorization');
jest.mock('../../common/hooks/use_availability');
const mockUseRoutesAuthorization = useRoutesAuthorization as jest.Mock;
const mockUseIsAvailable = useIsAvailable as jest.Mock;

jest.mock('./create_integration_landing', () => ({
  CreateIntegrationLanding: jest.fn(() => <div data-test-subj="landingMock" />),
}));
jest.mock('./create_integration_upload', () => ({
  CreateIntegrationUpload: jest.fn(() => <div data-test-subj="uploadMock" />),
}));
jest.mock('./create_automatic_import', () => ({
  CreateAutomaticImport: jest.fn(() => <div data-test-subj="assistantMock" />),
}));

const getWrapper = (pathname: string): React.FC<PropsWithChildren<{}>> =>
  function wrapper({ children }) {
    return (
      <TestProvider>
        <MemoryRouter initialEntries={[{ pathname }]}>{children}</MemoryRouter>
      </TestProvider>
    );
  };

const getElement = () => <CreateIntegration services={mockServices} />;

describe('CreateIntegration', () => {
  describe('when url is /create', () => {
    let wrapper: React.ComponentType;
    beforeEach(() => {
      wrapper = getWrapper('/create');
    });

    it('should render the landing page', () => {
      const result = render(getElement(), { wrapper });
      expect(result.queryByTestId('landingMock')).toBeInTheDocument();
    });

    describe('and user is not authorized', () => {
      beforeEach(() => {
        mockUseRoutesAuthorization.mockReturnValueOnce({
          canUseAutomaticImport: false,
          canUseIntegrationUpload: false,
        });
      });

      it('should render the landing page', () => {
        const result = render(getElement(), { wrapper });
        expect(result.queryByTestId('landingMock')).toBeInTheDocument();
      });
    });

    describe('and the product is not available', () => {
      beforeEach(() => {
        mockUseIsAvailable.mockReturnValueOnce(false);
      });

      it('should render the landing page', () => {
        const result = render(getElement(), { wrapper });
        expect(result.queryByTestId('landingMock')).toBeInTheDocument();
      });
    });
  });

  describe('when url is /create/assistant', () => {
    let wrapper: React.ComponentType;

    beforeEach(() => {
      wrapper = getWrapper('/create/assistant');
    });

    it('should render the assistant page', () => {
      const result = render(getElement(), { wrapper });
      expect(result.queryByTestId('assistantMock')).toBeInTheDocument();
    });

    describe('and user is not authorized', () => {
      beforeEach(() => {
        mockUseRoutesAuthorization.mockReturnValueOnce({
          canUseAutomaticImport: false,
          canUseIntegrationUpload: true,
        });
      });

      it('should render the landing page', () => {
        const result = render(getElement(), { wrapper });
        expect(result.queryByTestId('assistantMock')).not.toBeInTheDocument();
        expect(result.queryByTestId('landingMock')).toBeInTheDocument();
      });
    });

    describe('and the product is not available', () => {
      beforeEach(() => {
        mockUseIsAvailable.mockReturnValueOnce(false);
      });

      it('should render the landing page', () => {
        const result = render(getElement(), { wrapper });
        expect(result.queryByTestId('assistantMock')).not.toBeInTheDocument();
        expect(result.queryByTestId('landingMock')).toBeInTheDocument();
      });
    });
  });

  describe('when url is /create/upload', () => {
    let wrapper: React.ComponentType;

    beforeEach(() => {
      wrapper = getWrapper('/create/upload');
    });

    it('should render the upload page', () => {
      const result = render(getElement(), { wrapper });
      expect(result.queryByTestId('uploadMock')).toBeInTheDocument();
    });

    describe('and user is not authorized', () => {
      beforeEach(() => {
        mockUseRoutesAuthorization.mockReturnValueOnce({
          canUseAutomaticImport: true,
          canUseIntegrationUpload: false,
        });
      });

      it('should render the landing page', () => {
        const result = render(getElement(), { wrapper });
        expect(result.queryByTestId('uploadMock')).not.toBeInTheDocument();
        expect(result.queryByTestId('landingMock')).toBeInTheDocument();
      });
    });

    describe('and the product is not available', () => {
      beforeEach(() => {
        mockUseIsAvailable.mockReturnValueOnce(false);
      });

      it('should render the landing page', () => {
        const result = render(getElement(), { wrapper });
        expect(result.queryByTestId('uploadMock')).not.toBeInTheDocument();
        expect(result.queryByTestId('landingMock')).toBeInTheDocument();
      });
    });
  });

  describe('when url is not exact', () => {
    let wrapper: React.ComponentType;

    beforeEach(() => {
      wrapper = getWrapper('/create/something_else');
    });

    it('should render the landing page', () => {
      const result = render(getElement(), { wrapper });
      expect(result.queryByTestId('landingMock')).toBeInTheDocument();
    });
  });
});
