/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import {
  EuiButton,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiButtonEmpty,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n, SUPPORTED_LOCALES } from '@kbn/i18n';
import type { LocaleValue } from '@kbn/user-profile-components';

import { useLanguage } from './use_language_hook';

interface Props {
  closeModal: () => void;
  configLocale: string;
}

export const LanguageModal: FC<Props> = ({ closeModal, configLocale }) => {
  const modalTitleId = useGeneratedHtmlId();
  const selectId = useGeneratedHtmlId();

  const { value: locale, initialValue: initialLocaleValue, isLoading, onChange } = useLanguage();

  const configLocaleLabel =
    SUPPORTED_LOCALES.find(({ id }) => id.toLowerCase() === configLocale.toLowerCase())?.label ??
    configLocale;
  const serverDefaultOption = {
    value: '',
    text: i18n.translate('xpack.cloudLinks.userMenuLinks.languageModalServerDefaultOption', {
      defaultMessage: 'Server default ({configLocaleLabel})',
      values: { configLocaleLabel },
    }),
  };
  const localeOptions = [
    serverDefaultOption,
    ...SUPPORTED_LOCALES.map(({ id, label }) => ({ value: id, text: label })),
  ];

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle size="m" id={modalTitleId}>
          {i18n.translate('xpack.cloudLinks.userMenuLinks.languageModalTitle', {
            defaultMessage: 'Language',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.cloudLinks.userMenuLinks.languageModalSelectLabel', {
            defaultMessage: 'Display language',
          })}
          fullWidth
        >
          <EuiSelect
            id={selectId}
            options={localeOptions}
            value={locale}
            onChange={(e) => onChange(e.target.value as LocaleValue, false)}
            data-test-subj="languageSelect"
            fullWidth
          />
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="languageModalDiscardButton"
          onClick={() => {
            onChange(initialLocaleValue, false);
            closeModal();
          }}
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.languageModalDiscardBtnLabel', {
            defaultMessage: 'Discard',
          })}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="languageModalSaveButton"
          onClick={() => {
            if (locale !== initialLocaleValue) {
              onChange(locale, true);
            }
            closeModal();
          }}
          fill
          isLoading={isLoading}
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.languageModalSaveBtnLabel', {
            defaultMessage: 'Save changes',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
