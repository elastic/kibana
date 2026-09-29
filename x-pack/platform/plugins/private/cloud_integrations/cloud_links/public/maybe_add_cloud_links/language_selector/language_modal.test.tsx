/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, fireEvent, render } from '@testing-library/react';
import React, { type FC, type PropsWithChildren } from 'react';

import { EuiProvider } from '@elastic/eui';

import { LanguageModal } from './language_modal';
import { useLanguage } from './use_language_hook';

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

vi.mock('./use_language_hook');

vi.mock('@kbn/i18n', async () => {
  const original = (await vi.importActual('@kbn/i18n'));
  return {
    ...original,
    getAvailableLocales: vi.fn(() => [
      { id: 'en', label: 'English' },
      { id: 'fr-FR', label: 'Français' },
      { id: 'ja-JP', label: '日本語' },
    ]),
  };
});

describe('LanguageModal', () => {
  const closeModal = vi.fn();
  let onChangeMock: Mock;
  let reportEventMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onChangeMock = vi.fn().mockResolvedValue(undefined);
    reportEventMock = vi.fn();

    (useLanguage as Mock).mockReturnValue({
      value: 'en',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });
  });

  const renderModal = (analytics: { reportEvent: Mock } = { reportEvent: reportEventMock }) =>
    render(<LanguageModal closeModal={closeModal} analytics={analytics as any} />, {
      wrapper: Wrapper,
    });

  it('renders the language select with available locales', () => {
    const { getByTestId } = renderModal();
    const select = getByTestId('languageSelect') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options).toHaveLength(3);
  });

  it('saves and reports display_language_changed event when locale changed', async () => {
    (useLanguage as Mock).mockReturnValue({
      value: 'fr-FR',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });

    const { getByTestId } = renderModal({ reportEvent: reportEventMock });

    await act(async () => {
      fireEvent.click(getByTestId('languageModalSaveButton'));
    });

    expect(onChangeMock).toHaveBeenCalledWith('fr-FR', true);
    expect(reportEventMock).toHaveBeenCalledWith('display_language_changed', {
      from: 'en',
      to: 'fr-FR',
    });
    expect(closeModal).toHaveBeenCalled();
  });

  it('does not report event or close modal when save fails', async () => {
    onChangeMock.mockRejectedValue(new Error('save failed'));
    (useLanguage as Mock).mockReturnValue({
      value: 'fr-FR',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });

    const { getByTestId } = renderModal({ reportEvent: reportEventMock });

    await act(async () => {
      fireEvent.click(getByTestId('languageModalSaveButton'));
    });

    expect(onChangeMock).toHaveBeenCalledWith('fr-FR', true);
    expect(reportEventMock).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('does not report event when locale is unchanged', () => {
    const { getByTestId } = renderModal({ reportEvent: reportEventMock });

    fireEvent.click(getByTestId('languageModalSaveButton'));

    expect(onChangeMock).not.toHaveBeenCalled();
    expect(reportEventMock).not.toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
  });

  it('discards changes and closes modal without saving or reporting', () => {
    (useLanguage as Mock).mockReturnValue({
      value: 'fr-FR',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });

    const { getByTestId } = renderModal({ reportEvent: reportEventMock });

    fireEvent.click(getByTestId('languageModalDiscardButton'));

    expect(reportEventMock).not.toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
  });
});
