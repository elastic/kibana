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
  EuiBadge,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSwitch,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Theme } from '@emotion/react';
import { css } from '@emotion/react';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { i18n, getAvailableLocales } from '@kbn/i18n';
import type { LocaleValue } from '@kbn/user-profile-components';

import { useLanguage } from './use_language_hook';
import { useTranslationResilience } from './use_translation_resilience_hook';

const betaBadgeStyle = ({ euiTheme }: Theme) => css`
  padding: calc(${euiTheme.size.xxs} * 1.5);
  border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
  border-radius: 50%;
`;

interface Props {
  closeModal: () => void;
  analytics: AnalyticsServiceStart;
}

export const LanguageModal: FC<Props> = ({ closeModal, analytics }) => {
  const modalTitleId = useGeneratedHtmlId();
  const selectId = useGeneratedHtmlId();

  const {
    value: locale,
    initialValue: initialLocaleValue,
    isLoading: isLocaleLoading,
    onChange,
  } = useLanguage();
  const {
    value: installTranslationResilience,
    initialValue: initialInstallTranslationResilience,
    isLoading: isResilienceLoading,
    onChange: onResilienceChange,
  } = useTranslationResilience();
  const isLoading = isLocaleLoading || isResilienceLoading;

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
        <EuiFormRow
          label={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.cloudLinks.userMenuLinks.translationResilienceSwitchLabel', {
                  defaultMessage: 'Browser translation compatibility',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.cloudLinks.userMenuLinks.translationResilienceExperimentalBadge',
                    { defaultMessage: 'Experimental' }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          helpText={i18n.translate(
            'xpack.cloudLinks.userMenuLinks.translationResilienceSwitchHelp',
            {
              defaultMessage:
                'Keeps Kibana responsive when Chrome or Microsoft Edge translates the page. Reload the page after saving.',
            }
          )}
          fullWidth
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.cloudLinks.userMenuLinks.translationResilienceSwitchAriaLabel',
              { defaultMessage: 'Browser translation compatibility' }
            )}
            checked={installTranslationResilience}
            onChange={(e) => onResilienceChange(e.target.checked, false)}
            data-test-subj="translationResilienceSwitch"
          />
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="languageModalDiscardButton"
          onClick={() => {
            onChange(initialLocaleValue, false);
            onResilienceChange(initialInstallTranslationResilience, false);
            closeModal();
          }}
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.languageModalDiscardBtnLabel', {
            defaultMessage: 'Discard',
          })}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="languageModalSaveButton"
          onClick={async () => {
            const localeChanged = locale !== initialLocaleValue;
            const resilienceChanged =
              installTranslationResilience !== initialInstallTranslationResilience;
            try {
              if (localeChanged) {
                await onChange(locale, true);
              }
              if (resilienceChanged) {
                await onResilienceChange(installTranslationResilience, true);
              }
            } catch (_) {
              return;
            }
            if (localeChanged) {
              analytics.reportEvent('display_language_changed', {
                from: initialLocaleValue,
                to: locale,
              });
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
