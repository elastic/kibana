/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockInstance } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SemanticTextBanner } from '../../../public/application/sections/home/index_list/details_page/semantic_text_banner';

const mockNavigate = vi.fn();
const mockUseAppContext = vi.fn();
vi.mock('../../../public/application/app_context', () => {
      const mocked = {
      useAppContext: () => mockUseAppContext(),
    };
      return { ...mocked, default: mocked };
    });

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('SemanticTextBanner', () => {
  let getItemSpy: MockInstance;
  let setItemSpy: MockInstance;

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  describe('when user can manage license', () => {
    beforeEach(() => {
      mockUseAppContext.mockReturnValue({
        core: {
          application: {
            capabilities: { management: { stack: { license_management: true } } },
          },
        },
        plugins: {
          share: {
            url: {
              locators: {
                get: () => ({
                  navigate: mockNavigate,
                }),
              },
            },
          },
        },
      });
    });

    it('should display the banner', () => {
      renderWithIntl(<SemanticTextBanner />);

      expect(getItemSpy).toHaveBeenCalledWith('semantic-text-banner-display');
      expect(screen.getByTestId('indexDetailsMappingsSemanticTextBanner')).toBeInTheDocument();
    });

    it('should navigate to the license management page when clicked', () => {
      renderWithIntl(<SemanticTextBanner />);

      const manageButton = screen.getByTestId('SemanticTextBannerManageLicenseButton');
      fireEvent.click(manageButton);

      expect(mockNavigate).toHaveBeenCalledWith({ page: 'dashboard' });
    });

    it('should hide the banner if dismiss is clicked', async () => {
      renderWithIntl(<SemanticTextBanner />);

      const dismissButton = screen.getByTestId('euiDismissCalloutButton');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith('semantic-text-banner-display', 'false');
        expect(
          screen.queryByTestId('indexDetailsMappingsSemanticTextBanner')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('when user cannot manage license', () => {
    beforeEach(() => {
      mockUseAppContext.mockReturnValue({
        core: {
          application: {
            capabilities: { management: { stack: { license_management: false } } },
          },
        },
        plugins: {
          share: {
            url: {
              locators: {
                get: () => ({
                  navigate: mockNavigate,
                }),
              },
            },
          },
        },
      });
    });

    it('should display the banner without the "Manage license" button', () => {
      renderWithIntl(<SemanticTextBanner />);

      expect(screen.getByTestId('indexDetailsMappingsSemanticTextBanner')).toBeInTheDocument();
      expect(screen.queryByTestId('SemanticTextBannerManageLicenseButton')).not.toBeInTheDocument();
    });
  });
});
