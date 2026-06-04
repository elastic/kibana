/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Theme } from '@emotion/react';
import { css } from '@emotion/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n, getAvailableLocales } from '@kbn/i18n';
import type { LocaleValue } from '@kbn/user-profile-components';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

import { useLanguage } from './use_language_hook';

const betaBadgeStyle = ({ euiTheme }: Theme) => css`
  padding: calc(${euiTheme.size.xxs} * 1.5);
  border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
  border-radius: 50%;
`;

interface Props {
  closeModal: () => void;
  usageCollection?: UsageCollectionStart;
}

export const LanguageModal: FC<Props> = ({ closeModal, usageCollection }) => {
  const modalTitleId = useGeneratedHtmlId();
  const selectId = useGeneratedHtmlId();

  const { value: locale, initialValue: initialLocaleValue, isLoading, onChange } = useLanguage();

  const localeOptions = getAvailableLocales().map(({ id, label }) => ({ value: id, text: label }));

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
          label={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.cloudLinks.userMenuLinks.languageModalSelectLabel', {
                  defaultMessage: 'Display language',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div css={betaBadgeStyle}>
                  <EuiIconTip
                    aria-label={i18n.translate(
                      'xpack.cloudLinks.userMenuLinks.languageModalBetaBadgeLabel',
                      { defaultMessage: 'beta' }
                    )}
                    content={i18n.translate(
                      'xpack.cloudLinks.userMenuLinks.languageModalBetaBadgeTooltip',
                      {
                        defaultMessage: 'The display language setting is currently a beta feature.',
                      }
                    )}
                    type="beta"
                    position="bottom"
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
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
              usageCollection?.reportUiCounter('display_language', METRIC_TYPE.COUNT, [
                `language_changed_from_${initialLocaleValue}`,
                `language_changed_to_${locale}`,
              ]);
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
