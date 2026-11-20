/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiColorPicker,
  EuiColorPickerSwatch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useFormikContext } from 'formik';
import type { FocusEvent, FunctionComponent, KeyboardEvent, MouseEvent } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import {
  CHROME_COLOR_PRESETS,
  deriveChromeColors,
  resolveChromeColor,
} from '@kbn/core-user-settings-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormField, FormLabel, FormRow } from '@kbn/security-form-components';

import { VALID_HEX_COLOR } from './utils';

export type ChromeColorKey = 'chromeColor' | 'chromeColorLight' | 'chromeColorDark';

const CHROME_COLOR_KEYS = ['chromeColor', 'chromeColorLight', 'chromeColorDark'] as const;

export interface ChromeColorEditorProps {
  values: Record<ChromeColorKey, string>;
  /** Name prefix of the form fields, e.g. `data.userSettings`. */
  namePrefix: string;
  onChange: (key: ChromeColorKey, value: string) => void;
}

const isPresetColor = (color: string) =>
  getNavigationColorSwatches().some((swatch) => swatch.color.toLowerCase() === color.toLowerCase());

/**
 * Presets offered as keypad options. The custom-color option uses the color field instead.
 */
const getNavigationColorSwatches = (): Array<{ color: string; label: string }> => [
  {
    color: '#010101',
    label: i18n.translate('xpack.security.accountManagement.userProfile.chromeColorBinary', {
      defaultMessage: 'Binary',
    }),
  },
  {
    color: '#101C3F',
    label: i18n.translate('xpack.security.accountManagement.userProfile.chromeColorDeveloperBlue', {
      defaultMessage: 'Developer Blue',
    }),
  },
  {
    color: '#128D91',
    label: i18n.translate('xpack.security.accountManagement.userProfile.chromeColorDarkTeal', {
      defaultMessage: 'Dark Teal',
    }),
  },
  {
    color: '#E55940',
    label: i18n.translate('xpack.security.accountManagement.userProfile.chromeColorDarkPoppy', {
      defaultMessage: 'Dark Poppy',
    }),
  },
];

interface NavigationColorPickerProps {
  color: string;
  onChange: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  'aria-label': string;
  placeholder?: string;
  fullWidth?: boolean;
  isInvalid?: boolean;
  'data-test-subj'?: string;
}

/** Circle used inside a keypad item. */
const ColorCircle: FunctionComponent<{ color?: string }> = ({ color }) => {
  const { euiTheme } = useEuiTheme();
  // An empty custom color uses a transparency checkerboard until a value is chosen.
  const checkerboard = css`
    background-color: ${euiTheme.colors.emptyShade};
    background-image: linear-gradient(
        45deg,
        ${euiTheme.colors.backgroundBaseSubdued} 25%,
        transparent 25%
      ),
      linear-gradient(-45deg, ${euiTheme.colors.backgroundBaseSubdued} 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, ${euiTheme.colors.backgroundBaseSubdued} 75%),
      linear-gradient(-45deg, transparent 75%, ${euiTheme.colors.backgroundBaseSubdued} 75%);
    background-size: ${euiTheme.size.s} ${euiTheme.size.s};
    background-position: 0 0, 0 ${euiTheme.size.xs}, ${euiTheme.size.xs} -${euiTheme.size.xs},
      -${euiTheme.size.xs} 0;
    border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.borderBasePlain};
  `;
  const derived = color ? deriveChromeColors(color) : undefined;
  const segment = css`
    position: absolute;
  `;

  return (
    <span
      css={[
        css`
          position: relative;
          display: block;
          overflow: hidden;
          inline-size: calc(${euiTheme.size.base} * 3);
          block-size: calc(${euiTheme.size.base} * 3);
          border-radius: 50%;
        `,
        color ? undefined : checkerboard,
      ]}
    >
      {/* Top is the selected color. Bottom left is the derived light shade, bottom right the dark. */}
      {derived && (
        <>
          <span
            css={[
              segment,
              css`
                inset-block-start: 0;
                inset-inline-start: 0;
                inline-size: 100%;
                block-size: 50%;
                background-color: ${color};
              `,
            ]}
          />
          <span
            css={[
              segment,
              css`
                inset-block-end: 0;
                left: 0;
                inline-size: 50%;
                block-size: 50%;
                background-color: ${derived.light};
              `,
            ]}
          />
          <span
            css={[
              segment,
              css`
                inset-block-end: 0;
                right: 0;
                inline-size: 50%;
                block-size: 50%;
                background-color: ${derived.dark};
              `,
            ]}
          />
        </>
      )}
    </span>
  );
};

/**
 * Custom background color field. Presets live in the keypad, so this popover is only the picker.
 */
const NavigationColorPicker: FunctionComponent<NavigationColorPickerProps> = ({
  color,
  onChange,
  onBlur,
  'aria-label': ariaLabel,
  placeholder,
  fullWidth,
  isInvalid,
  'data-test-subj': dataTestSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const clearLabel = i18n.translate(
    'xpack.security.accountManagement.userProfile.chromeColorClear',
    { defaultMessage: 'Clear custom background color' }
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downLeft"
      display="block"
      aria-label={ariaLabel}
      button={
        <div>
          <EuiFieldText
            fullWidth={fullWidth}
            value={color}
            placeholder={placeholder}
            aria-label={ariaLabel}
            isInvalid={isInvalid}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(true);
            }}
            prepend={
              <EuiColorPickerSwatch
                color={color || undefined}
                aria-label={ariaLabel}
                showToolTip={false}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOpen((open) => !open);
                }}
              />
            }
            append={
              color ? (
                <EuiToolTip content={clearLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    size="s"
                    aria-label={clearLabel}
                    data-test-subj="userProfileChromeColorClear"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      setIsOpen(false);
                      onChange('');
                    }}
                  />
                </EuiToolTip>
              ) : undefined
            }
            data-test-subj={dataTestSubj}
          />
        </div>
      }
    >
      <EuiColorPicker
        aria-label={ariaLabel}
        display="inline"
        mode="picker"
        color={color}
        onChange={onChange}
      />
    </EuiPopover>
  );
};

/** Empty values clear the setting; anything else must be a valid hex color. */
const validateOptionalHexColor = (value: string) =>
  !value || VALID_HEX_COLOR.test(value)
    ? undefined
    : i18n.translate('xpack.security.accountManagement.userProfile.chromeColorPatternError', {
        defaultMessage: 'Enter a valid HEX color code.',
      });

interface ModeColorFieldProps {
  colorKey: 'chromeColorLight' | 'chromeColorDark';
  namePrefix: string;
  label: string;
  ariaLabel: string;
  /** Resolved color to display: an override, or the shade derived from the base color. */
  displayedColor: string | undefined;
  isEditing: boolean;
  isDisabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Read-only input showing the mode color as a swatch plus its hex code. While editing, the swatch
 * opens a color picker; the hex text stays display-only.
 */
const ModeColorField: FunctionComponent<ModeColorFieldProps> = ({
  colorKey,
  namePrefix,
  label,
  ariaLabel,
  displayedColor,
  isEditing,
  isDisabled = false,
  onChange,
}) => {
  const inputId = useGeneratedHtmlId({ prefix: colorKey });
  const swatchRef = useRef<HTMLButtonElement>(null);
  const hex = displayedColor ? displayedColor.toUpperCase() : '';

  const openPicker = () => {
    swatchRef.current?.click();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  const canEdit = isEditing && !isDisabled;
  const swatch = canEdit ? (
    <EuiColorPicker
      aria-label={ariaLabel}
      color={displayedColor ?? ''}
      onChange={(value: string) => {
        if (value && !VALID_HEX_COLOR.test(value)) return;
        onChange(value);
      }}
      swatches={CHROME_COLOR_PRESETS}
      button={
        <EuiColorPickerSwatch
          ref={swatchRef}
          color={displayedColor}
          showToolTip={false}
          aria-label={ariaLabel}
        />
      }
      data-test-subj={`userProfile-${colorKey}`}
    />
  ) : (
    <EuiColorPickerSwatch color={displayedColor} disabled showToolTip={false} aria-hidden />
  );

  return (
    <FormRow
      name={`${namePrefix}.${colorKey}`}
      label={<FormLabel for={`${namePrefix}.${colorKey}`}>{label}</FormLabel>}
      fullWidth
    >
      <EuiFieldText
        id={inputId}
        readOnly
        disabled={isDisabled}
        fullWidth
        value={hex}
        prepend={swatch}
        placeholder={i18n.translate(
          'xpack.security.accountManagement.userProfile.chromeColorDefault',
          { defaultMessage: 'Default' }
        )}
        aria-label={ariaLabel}
        data-test-subj={`userProfileChromeColorInput-${colorKey}`}
        onClick={canEdit ? openPicker : undefined}
        onKeyDown={canEdit ? onInputKeyDown : undefined}
      />
    </FormRow>
  );
};

/**
 * Lets the user pick the chrome background. A preset stores one color and its shades are derived.
 * Light and dark mode can be edited only after a custom color is chosen.
 */
export const ChromeColorEditor: FunctionComponent<ChromeColorEditorProps> = ({
  values,
  namePrefix,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const formik = useFormikContext();
  const hasStoredColor = CHROME_COLOR_KEYS.some((key) => Boolean(values[key]));
  const [isCustomAppearanceEnabled, setIsCustomAppearanceEnabled] = useState(hasStoredColor);
  // Validation reads this during setFieldValue, before the switch state renders.
  const isCustomAppearanceEnabledRef = useRef(isCustomAppearanceEnabled);
  isCustomAppearanceEnabledRef.current = isCustomAppearanceEnabled;
  // A stored color that is not one of the presets opens on the custom-color pad.
  const [customSelected, setCustomSelected] = useState(
    () => Boolean(values.chromeColor) && !isPresetColor(values.chromeColor)
  );
  // Field validation reads this during setFieldValue, before the state update renders.
  const customSelectedRef = useRef(customSelected);
  customSelectedRef.current = customSelected;
  const [isEditing, setIsEditing] = useState(false);
  const swatches = getNavigationColorSwatches();
  const presetSelected =
    !customSelected && Boolean(values.chromeColor) && isPresetColor(values.chromeColor);
  const customColorValue =
    customSelected && VALID_HEX_COLOR.test(values.chromeColor) && !isPresetColor(values.chromeColor)
      ? values.chromeColor
      : '';
  const displayedLight = customColorValue ? resolveChromeColor(values, false) : undefined;
  const displayedDark = customColorValue ? resolveChromeColor(values, true) : undefined;
  const showCustomField = isCustomAppearanceEnabled && customSelected;
  const customColorLabel = i18n.translate(
    'xpack.security.accountManagement.userProfile.chromeColorCustomOption',
    { defaultMessage: 'Custom color' }
  );
  // Colors in effect before the switch was turned off, so turning it back on (or discarding)
  // can restore them. `sawClearedValues` ignores the render before Formik applies the clear.
  const valuesBeforeDisable = useRef(values);
  const disabledWhileCleared = useRef(false);
  const sawClearedValues = useRef(false);
  const editLabel = i18n.translate('xpack.security.accountManagement.userProfile.chromeColorEdit', {
    defaultMessage: 'Edit light and dark mode colors',
  });
  const doneLabel = i18n.translate('xpack.security.accountManagement.userProfile.chromeColorDone', {
    defaultMessage: 'Done editing light and dark mode colors',
  });
  // A custom color fills both mode shades. Editing a mode afterward overrides just that one.
  const handleNavigationColorChange = (value: string) => {
    onChange('chromeColor', value);
    if (VALID_HEX_COLOR.test(value)) {
      const derived = deriveChromeColors(value);
      onChange('chromeColorLight', derived.light);
      onChange('chromeColorDark', derived.dark);
      return;
    }
    if (!value) {
      onChange('chromeColorLight', '');
      onChange('chromeColorDark', '');
    }
  };

  // Off clears every custom color so light and dark mode fall back to the built-in chrome.
  // The fields stay mounted (hidden) so the unsaved-change count keeps the save bar up.
  const handleCustomAppearanceChange = (checked: boolean) => {
    isCustomAppearanceEnabledRef.current = checked;
    if (!checked) {
      valuesBeforeDisable.current = values;
      disabledWhileCleared.current = true;
      sawClearedValues.current = false;
      setIsEditing(false);
      CHROME_COLOR_KEYS.forEach((key) => onChange(key, ''));
      setIsCustomAppearanceEnabled(false);
      return;
    }

    disabledWhileCleared.current = false;
    sawClearedValues.current = false;
    CHROME_COLOR_KEYS.forEach((key) => onChange(key, valuesBeforeDisable.current[key]));
    setIsCustomAppearanceEnabled(true);
  };

  useEffect(() => {
    if (!disabledWhileCleared.current) {
      return;
    }
    const hasCustomColor = CHROME_COLOR_KEYS.some((key) => Boolean(values[key]));
    if (!hasCustomColor) {
      sawClearedValues.current = true;
      return;
    }
    // Discard put the saved colors back while the switch was off.
    if (sawClearedValues.current) {
      disabledWhileCleared.current = false;
      sawClearedValues.current = false;
      setCustomSelected(Boolean(values.chromeColor) && !isPresetColor(values.chromeColor));
      setIsCustomAppearanceEnabled(true);
    }
  }, [values]);

  const selectPreset = (color: string) => {
    customSelectedRef.current = false;
    setCustomSelected(false);
    setIsEditing(false);
    onChange('chromeColor', color);
    onChange('chromeColorLight', '');
    onChange('chromeColorDark', '');
  };

  const selectCustomColor = () => {
    customSelectedRef.current = true;
    setCustomSelected(true);
    setIsEditing(false);
    // Keep the saved colors until a custom value is picked, so the save bar stays hidden.
    if (!values.chromeColor || isPresetColor(values.chromeColor)) {
      CHROME_COLOR_KEYS.forEach((key) => {
        const initialValue = formik.getFieldMeta(`${namePrefix}.${key}`).initialValue;
        onChange(key, typeof initialValue === 'string' ? initialValue : '');
      });
    }
  };

  const validateCustomBackgroundColor = (value: string) => {
    if (
      isCustomAppearanceEnabledRef.current &&
      customSelectedRef.current &&
      (!value || isPresetColor(value))
    ) {
      return i18n.translate(
        'xpack.security.accountManagement.userProfile.chromeColorSelectValueRequired',
        { defaultMessage: 'Select a value.' }
      );
    }
    return validateOptionalHexColor(value);
  };

  const modeFieldsDisabled = customSelected && !customColorValue;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="l"
      grow={false}
      data-test-subj="userProfileCustomAppearance"
      css={css`
        margin-block: ${euiTheme.size.base};
        margin-inline: 0;
      `}
    >
      <EuiSwitch
        label={i18n.translate(
          'xpack.security.accountManagement.userProfile.customAppearanceTitle',
          { defaultMessage: 'Custom appearance' }
        )}
        checked={isCustomAppearanceEnabled}
        onChange={(event) => handleCustomAppearanceChange(event.target.checked)}
        data-test-subj="userProfileCustomAppearanceSwitch"
      />
      {isCustomAppearanceEnabled && (
        <div
          css={css`
            padding-block-start: ${euiTheme.size.base};
          `}
        >
          <EuiKeyPadMenu
            checkable={{
              ariaLegend: i18n.translate(
                'xpack.security.accountManagement.userProfile.chromeColorOptionsLabel',
                { defaultMessage: 'Navigation colors' }
              ),
            }}
            data-test-subj="userProfileChromeColorOptions"
            css={css`
              display: flex;
              flex-direction: row;
              flex-wrap: nowrap;
              gap: ${euiTheme.size.xs};
              inline-size: 100%;
              max-inline-size: 100%;

              .euiKeyPadMenuItem {
                flex: 1 1 0;
                inline-size: auto;
                min-inline-size: 0;
                block-size: auto;
                min-block-size: calc(${euiTheme.size.base} * 6);
              }
            `}
          >
            {swatches.map((swatch) => (
              <EuiKeyPadMenuItem
                key={swatch.color}
                name="chromeColorPreset"
                checkable="single"
                label={swatch.label}
                isSelected={
                  presetSelected && values.chromeColor.toLowerCase() === swatch.color.toLowerCase()
                }
                onChange={() => selectPreset(swatch.color)}
                data-test-subj={`userProfileChromeColorOption-${swatch.color}`}
              >
                <ColorCircle color={swatch.color} />
              </EuiKeyPadMenuItem>
            ))}
            <EuiKeyPadMenuItem
              name="chromeColorPreset"
              checkable="single"
              label={
                <span
                  css={css`
                    color: ${euiTheme.colors.textPrimary};
                  `}
                >
                  {customColorLabel}
                </span>
              }
              isSelected={customSelected}
              onChange={selectCustomColor}
              data-test-subj="userProfileChromeColorOption-custom"
            >
              <ColorCircle color={customColorValue || undefined} />
            </EuiKeyPadMenuItem>
          </EuiKeyPadMenu>
        </div>
      )}
      <div hidden={!showCustomField}>
        <EuiSpacer size="m" />
        <FormRow
          name={`${namePrefix}.chromeColor`}
          label={
            <FormLabel for={`${namePrefix}.chromeColor`}>
              <FormattedMessage
                id="xpack.security.accountManagement.userProfile.chromeColorCustomBackgroundLabel"
                defaultMessage="Custom background color"
              />
            </FormLabel>
          }
          helpText={
            <FormattedMessage
              id="xpack.security.accountManagement.userProfile.chromeColorCustomBackgroundHelpText"
              defaultMessage="Select a custom color for your light and dark mode background Kibana experience."
            />
          }
          fullWidth
        >
          <FormField
            as={NavigationColorPicker}
            name={`${namePrefix}.chromeColor`}
            color={customColorValue}
            aria-label={i18n.translate(
              'xpack.security.accountManagement.userProfile.chromeColorAriaLabel',
              { defaultMessage: 'Custom background color' }
            )}
            placeholder={i18n.translate(
              'xpack.security.accountManagement.userProfile.chromeColorSelectValue',
              { defaultMessage: 'Select value' }
            )}
            validate={validateCustomBackgroundColor}
            onChange={handleNavigationColorChange}
            fullWidth
            data-test-subj="userProfile-chromeColor"
          />
        </FormRow>
      </div>

      <div hidden={!showCustomField}>
        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
          <EuiFlexItem>
            <ModeColorField
              colorKey="chromeColorLight"
              namePrefix={namePrefix}
              label={i18n.translate(
                'xpack.security.accountManagement.userProfile.chromeColorLight',
                { defaultMessage: 'Light mode' }
              )}
              ariaLabel={i18n.translate(
                'xpack.security.accountManagement.userProfile.chromeColorLightAriaLabel',
                { defaultMessage: 'Light mode navigation color' }
              )}
              displayedColor={displayedLight}
              isEditing={isEditing}
              isDisabled={modeFieldsDisabled}
              onChange={(value) => onChange('chromeColorLight', value)}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ModeColorField
              colorKey="chromeColorDark"
              namePrefix={namePrefix}
              label={i18n.translate(
                'xpack.security.accountManagement.userProfile.chromeColorDark',
                { defaultMessage: 'Dark mode' }
              )}
              ariaLabel={i18n.translate(
                'xpack.security.accountManagement.userProfile.chromeColorDarkAriaLabel',
                { defaultMessage: 'Dark mode navigation color' }
              )}
              displayedColor={displayedDark}
              isEditing={isEditing}
              isDisabled={modeFieldsDisabled}
              onChange={(value) => onChange('chromeColorDark', value)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiToolTip content={isEditing ? doneLabel : editLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={isEditing ? 'check' : 'pencil'}
                  color={isEditing ? 'success' : 'primary'}
                  aria-label={isEditing ? doneLabel : editLabel}
                  isDisabled={modeFieldsDisabled}
                  onClick={() => setIsEditing((editing) => !editing)}
                  data-test-subj="userProfileChromeColorEdit"
                  css={css`
                    block-size: ${euiTheme.size.xxl};
                    inline-size: ${euiTheme.size.xxl};
                  `}
                />
              </EuiToolTip>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );
};
