/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FunctionComponent } from 'react';
import React from 'react';

import {
  CHROME_COLOR_PRESETS,
  deriveChromeColors,
  getChromeColorMode,
  resolveChromeColor,
} from '@kbn/core-user-settings-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormField, FormLabel, FormRow } from '@kbn/security-form-components';

import { VALID_HEX_COLOR } from './utils';

export type ChromeColorKey = 'chromeColor' | 'chromeColorLight' | 'chromeColorDark';

export interface ChromeColorEditorProps {
  values: Record<ChromeColorKey, string>;
  /** Name prefix of the form fields, e.g. `data.userSettings`. */
  namePrefix: string;
  onChange: (key: ChromeColorKey, value: string) => void;
}

/** Empty values clear the setting; anything else must be a valid hex color. */
const validateOptionalHexColor = (value: string) =>
  !value || VALID_HEX_COLOR.test(value)
    ? undefined
    : i18n.translate('xpack.security.accountManagement.userProfile.chromeColorPatternError', {
        defaultMessage: 'Enter a valid HEX color code.',
      });

const ChromeColorPreview: FunctionComponent<{
  label: string;
  background: string | undefined;
  'data-test-subj'?: string;
}> = ({ label, background, 'data-test-subj': dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  const colorMode = background ? getChromeColorMode(background) : undefined;

  const chip = (
    <div
      data-test-subj={dataTestSubj}
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-radius: ${euiTheme.border.radius.medium};
        border: ${euiTheme.border.thin};
        background: ${background ?? euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiText size="xs">{label}</EuiText>
    </div>
  );

  return colorMode ? <EuiThemeProvider colorMode={colorMode}>{chip}</EuiThemeProvider> : chip;
};

/**
 * Lets the user pick the color of the chrome (header and navigation). A single color is enough:
 * the light and dark mode shades are derived from it, and can optionally be overridden.
 */
export const ChromeColorEditor: FunctionComponent<ChromeColorEditorProps> = ({
  values,
  namePrefix,
  onChange,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'chromeColorAdvanced' });
  const hasBase = VALID_HEX_COLOR.test(values.chromeColor);
  const derived = hasBase ? deriveChromeColors(values.chromeColor) : undefined;

  const renderPicker = (key: ChromeColorKey, ariaLabel: string, placeholder?: string) => (
    <FormField
      as={EuiColorPicker}
      name={`${namePrefix}.${key}`}
      color={values[key]}
      aria-label={ariaLabel}
      placeholder={placeholder}
      swatches={CHROME_COLOR_PRESETS}
      isClearable
      validate={validateOptionalHexColor}
      onChange={(value: string) => onChange(key, value)}
      fullWidth
      data-test-subj={`userProfile-${key}`}
    />
  );

  return (
    <>
      <FormRow
        name={`${namePrefix}.chromeColor`}
        label={
          <FormLabel for={`${namePrefix}.chromeColor`}>
            <FormattedMessage
              id="xpack.security.accountManagement.userProfile.chromeColorLabel"
              defaultMessage="Navigation color"
            />
          </FormLabel>
        }
        helpText={
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.chromeColorHelpText"
            defaultMessage="Sets the background color of the header and side navigation. Light and dark mode shades are derived from it. Applies to the solution navigation layout."
          />
        }
        fullWidth
      >
        {renderPicker(
          'chromeColor',
          i18n.translate('xpack.security.accountManagement.userProfile.chromeColorAriaLabel', {
            defaultMessage: 'Navigation color',
          }),
          i18n.translate('xpack.security.accountManagement.userProfile.chromeColorDefault', {
            defaultMessage: 'Default',
          })
        )}
      </FormRow>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <ChromeColorPreview
            label={i18n.translate('xpack.security.accountManagement.userProfile.chromeColorLight', {
              defaultMessage: 'Light mode',
            })}
            background={resolveChromeColor(values, false)}
            data-test-subj="userProfileChromeColorPreviewLight"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ChromeColorPreview
            label={i18n.translate('xpack.security.accountManagement.userProfile.chromeColorDark', {
              defaultMessage: 'Dark mode',
            })}
            background={resolveChromeColor(values, true)}
            data-test-subj="userProfileChromeColorPreviewDark"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiAccordion
        id={accordionId}
        buttonContent={
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.chromeColorCustomizeModes"
            defaultMessage="Customize light and dark mode colors"
          />
        }
        paddingSize="s"
        data-test-subj="userProfileChromeColorAdvanced"
      >
        <FormRow
          name={`${namePrefix}.chromeColorLight`}
          label={
            <FormLabel for={`${namePrefix}.chromeColorLight`}>
              <FormattedMessage
                id="xpack.security.accountManagement.userProfile.chromeColorLightLabel"
                defaultMessage="Light mode color"
              />
            </FormLabel>
          }
          fullWidth
        >
          {renderPicker(
            'chromeColorLight',
            i18n.translate(
              'xpack.security.accountManagement.userProfile.chromeColorLightAriaLabel',
              { defaultMessage: 'Light mode navigation color' }
            ),
            derived?.light
          )}
        </FormRow>
        <FormRow
          name={`${namePrefix}.chromeColorDark`}
          label={
            <FormLabel for={`${namePrefix}.chromeColorDark`}>
              <FormattedMessage
                id="xpack.security.accountManagement.userProfile.chromeColorDarkLabel"
                defaultMessage="Dark mode color"
              />
            </FormLabel>
          }
          fullWidth
        >
          {renderPicker(
            'chromeColorDark',
            i18n.translate(
              'xpack.security.accountManagement.userProfile.chromeColorDarkAriaLabel',
              { defaultMessage: 'Dark mode navigation color' }
            ),
            derived?.dark
          )}
        </FormRow>
      </EuiAccordion>
    </>
  );
};
