/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React, { type FC, type PropsWithChildren } from 'react';

import { EuiProvider } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';

import { LanguageModal } from './language_modal';
import { useLanguage } from './use_language_hook';

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

jest.mock('./use_language_hook');

jest.mock('@kbn/i18n', () => {
  const original = jest.requireActual('@kbn/i18n');
  return {
    ...original,
    getAvailableLocales: jest.fn(() => [
      { id: 'en', label: 'English' },
      { id: 'fr-FR', label: 'Français' },
      { id: 'ja-JP', label: '日本語' },
    ]),
  };
});

describe('LanguageModal', () => {
  const closeModal = jest.fn();
  let onChangeMock: jest.Mock;
  let reportUiCounterMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onChangeMock = jest.fn();
    reportUiCounterMock = jest.fn();

    (useLanguage as jest.Mock).mockReturnValue({
      value: 'en',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });
  });

  const renderModal = (usageCollection?: { reportUiCounter: jest.Mock }) =>
    render(<LanguageModal closeModal={closeModal} usageCollection={usageCollection as any} />, {
      wrapper: Wrapper,
    });

  it('renders the language select with available locales', () => {
    const { getByTestId } = renderModal();
    const select = getByTestId('languageSelect') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options).toHaveLength(3);
  });

  it('saves and calls reportUiCounter with the selected locale when locale changed', () => {
    (useLanguage as jest.Mock).mockReturnValue({
      value: 'fr-FR',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });

    const { getByTestId } = renderModal({ reportUiCounter: reportUiCounterMock });

    fireEvent.click(getByTestId('languageModalSaveButton'));

    expect(onChangeMock).toHaveBeenCalledWith('fr-FR', true);
    expect(reportUiCounterMock).toHaveBeenCalledWith('display_language', METRIC_TYPE.COUNT, [
      'language_changed_from_en',
      'language_changed_to_fr-FR',
    ]);
    expect(closeModal).toHaveBeenCalled();
  });

  it('does not call reportUiCounter when locale is unchanged', () => {
    const { getByTestId } = renderModal({ reportUiCounter: reportUiCounterMock });

    fireEvent.click(getByTestId('languageModalSaveButton'));

    expect(onChangeMock).not.toHaveBeenCalled();
    expect(reportUiCounterMock).not.toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
  });

  it('does not call reportUiCounter when usageCollection is not provided', () => {
    (useLanguage as jest.Mock).mockReturnValue({
      value: 'ja-JP',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });

    const { getByTestId } = renderModal(undefined);

    fireEvent.click(getByTestId('languageModalSaveButton'));

    expect(onChangeMock).toHaveBeenCalledWith('ja-JP', true);
    expect(closeModal).toHaveBeenCalled();
  });

  it('discards changes and closes modal without saving or reporting', () => {
    (useLanguage as jest.Mock).mockReturnValue({
      value: 'fr-FR',
      initialValue: 'en',
      isLoading: false,
      isVisible: true,
      onChange: onChangeMock,
    });

    const { getByTestId } = renderModal({ reportUiCounter: reportUiCounterMock });

    fireEvent.click(getByTestId('languageModalDiscardButton'));

    expect(reportUiCounterMock).not.toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
  });
});
