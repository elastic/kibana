/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SemanticTextBanner } from '../../../public/application/sections/home/index_list/details_page/semantic_text_banner';

// Mock the documentation service
jest.mock('../../../public/application/services/documentation', () => ({
  documentationService: {
    getConfigureChunkingDocLink: () => 'https://example.com/docs/chunking',
  },
}));

// Wrapper component with I18nProvider
const renderWithIntl = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('When semantic_text is enabled', () => {
  let getItemSpy: jest.SpyInstance;
  let setItemSpy: jest.SpyInstance;

  beforeEach(() => {
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('should display the banner', () => {
    renderWithIntl(<SemanticTextBanner isSemanticTextEnabled={true} isPlatinumLicense={true} />);

    expect(getItemSpy).toHaveBeenCalledWith('semantic-text-banner-display');
    expect(screen.getByTestId('indexDetailsMappingsSemanticTextBanner')).toBeInTheDocument();
  });

  it('should contain content related to semantic_text', () => {
    renderWithIntl(<SemanticTextBanner isSemanticTextEnabled={true} isPlatinumLicense={true} />);

    const banner = screen.getByTestId('indexDetailsMappingsSemanticTextBanner');
    expect(banner.textContent).toContain('semantic_text field type now available!');
    expect(banner.textContent).toContain(
      'Documents will be automatically chunked to fit model context limits, to avoid truncation.'
    );
  });

  it('should hide the banner if dismiss is clicked', async () => {
    renderWithIntl(<SemanticTextBanner isSemanticTextEnabled={true} isPlatinumLicense={true} />);

    const dismissButton = screen.getByTestId('SemanticTextBannerDismissButton');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('semantic-text-banner-display', 'false');
      expect(
        screen.queryByTestId('indexDetailsMappingsSemanticTextBanner')
      ).not.toBeInTheDocument();
    });
  });
});

describe('when user does not have ML permissions', () => {
  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear();
  });

  it('should contain content related to semantic_text', () => {
    renderWithIntl(<SemanticTextBanner isSemanticTextEnabled={true} isPlatinumLicense={false} />);

    const banner = screen.getByTestId('indexDetailsMappingsSemanticTextBanner');
    expect(banner.textContent).toContain('Semantic text now available for platinum license');
  });
});

describe('When semantic_text is disabled', () => {
  it('should not display the banner', () => {
    renderWithIntl(<SemanticTextBanner isSemanticTextEnabled={false} isPlatinumLicense={true} />);

    expect(screen.queryByTestId('indexDetailsMappingsSemanticTextBanner')).not.toBeInTheDocument();
  });
});
