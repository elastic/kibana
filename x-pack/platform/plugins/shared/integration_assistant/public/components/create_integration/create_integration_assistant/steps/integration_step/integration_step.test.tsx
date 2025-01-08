/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, type RenderResult, fireEvent, waitFor } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { IntegrationStep } from './integration_step';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';

const integrationSettings = mockState.integrationSettings!;

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('IntegrationStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when settings are undefined', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(<IntegrationStep integrationSettings={undefined} />, { wrapper });
    });

    it('should render integration step page', () => {
      expect(result.queryByTestId('integrationStep')).toBeInTheDocument();
    });

    describe('when title changes', () => {
      const title = 'My Integration';
      beforeEach(() => {
        act(() => {
          fireEvent.change(result.getByTestId('integrationTitleInput'), {
            target: { value: title },
          });
        });
      });

      it('should call setIntegrationSettings', () => {
        expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({ title });
      });
    });

    describe('when description changes', () => {
      const description = 'My Integration description';
      beforeEach(() => {
        act(() => {
          fireEvent.change(result.getByTestId('integrationDescriptionInput'), {
            target: { value: description },
          });
        });
      });

      it('should call setIntegrationSettings', () => {
        expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({ description });
      });
    });

    describe('when logo is set', () => {
      describe('when logo is valid', () => {
        const file = new File(['(⌐□_□)'], 'test.svg', { type: 'image/svg+xml' });
        beforeEach(() => {
          act(() => {
            fireEvent.change(result.getByTestId('integrationLogoFilePicker'), {
              target: { files: [file] },
            });
          });
        });

        it('should call setIntegrationSettings', async () => {
          await waitFor(() => {
            expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({
              logo: expect.any(String),
            });
          });
        });
      });

      describe('when logo is too large', () => {
        const file = new File(['(⌐□_□)'], 'test.svg', { type: 'image/svg+xml' });
        Object.defineProperty(file, 'size', { value: 1024 * 1024 * 2 }); // override Blob size getter value by 2Mb
        beforeEach(() => {
          act(() => {
            fireEvent.change(result.getByTestId('integrationLogoFilePicker'), {
              target: { files: [file] },
            });
          });
        });

        it('should render logo error', async () => {
          await waitFor(() => {
            expect(
              result.queryByText('test.svg is too large, maximum size is 1Mb.')
            ).toBeInTheDocument();
          });
          expect(mockActions.setIntegrationSettings).not.toHaveBeenCalledWith();
        });
      });
    });

    describe('when logo is removed', () => {
      beforeEach(() => {
        act(() => {
          fireEvent.change(result.getByTestId('integrationLogoFilePicker'), {
            target: { files: [] },
          });
        });
      });

      it('should call setIntegrationSettings', async () => {
        await waitFor(() => {
          expect(mockActions.setIntegrationSettings).toHaveBeenCalledWith({
            logo: undefined,
          });
        });
      });
    });
  });

  describe('when settings are defined', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(<IntegrationStep integrationSettings={integrationSettings} />, { wrapper });
    });

    it('should render preview integration title', () => {
      expect(result.queryByTestId('packageCardPreview')).toHaveTextContent(
        integrationSettings.title!
      );
    });

    it('should render preview integration description', () => {
      expect(result.queryByTestId('packageCardPreview')).toHaveTextContent(
        integrationSettings.description!
      );
    });

    it('should render preview integration logo', () => {
      expect(result.queryByTestId('packageCardPreviewIcon')).toHaveAttribute(
        'data-euiicon-type',
        `data:image/svg+xml;base64,${integrationSettings.logo}`
      );
    });
  });
});
