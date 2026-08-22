/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldText,
  EuiFormControlLayout,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AVATAR_EMOJIS } from '../../../utils/avatar_emojis';
import { emojiFontStack } from '../../../../common.styles';

// Static styles shared by every emoji button — lifted out of the render loop.
// Uses `overflow: visible` so complex multi-codepoint emoji (e.g. 🧑‍💻) are not clipped,
// which EuiButtonEmpty's default `overflow: hidden` would cause.
const emojiButtonBaseStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 2px;
  overflow: visible;
  ${emojiFontStack}
`;

export interface AvatarSymbolPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
  isInvalid?: boolean;
  'aria-label'?: string;
  'data-test-subj'?: string;
}

export const AvatarSymbolPicker: React.FC<AvatarSymbolPickerProps> = ({
  value,
  onChange,
  disabled = false,
  isInvalid = false,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  // Delete / Backspace clears the current selection without opening the picker
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && value) {
      e.preventDefault();
      onChange('');
    }
  };

  // Follows the same EuiFormControlLayout pattern as EuiColorPicker:
  //   isDropdown  → standard EUI chevron (no background) when no value is set
  //   clear       → EUI's built-in × button when a value is set
  const trigger = (
    <EuiFormControlLayout
      fullWidth
      isDisabled={disabled}
      isInvalid={isInvalid}
      isDropdown={!value && !disabled}
      clear={
        value && !disabled
          ? {
              onClick: (e) => {
                e.stopPropagation();
                onChange('');
              },
            }
          : undefined
      }
    >
      {/*
       * `readOnly` is intentionally omitted: EUI's readOnly styles inject
       * `-webkit-text-fill-color` which overrides the placeholder colour in
       * WebKit/Blink, making "Pick an emoji" render dark. The field is kept
       * non-editable via the onChange no-op and onKeyDown guard instead.
       */}
      <EuiFieldText
        controlOnly
        value={value}
        onChange={() => {}}
        fullWidth
        disabled={disabled}
        isInvalid={isInvalid}
        placeholder={i18n.translate('xpack.agentBuilder.agents.form.avatarSymbolPlaceholder', {
          defaultMessage: 'Pick an emoji',
        })}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-label={
          ariaLabel ??
          i18n.translate('xpack.agentBuilder.agents.form.avatarSymbolAriaLabel', {
            defaultMessage: 'Agent avatar symbol input field',
          })
        }
        data-test-subj={dataTestSubj}
        css={css`
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          ${value ? emojiFontStack : ''}
        `}
      />
    </EuiFormControlLayout>
  );

  return (
    <EuiPopover
      button={trigger}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="s"
      display="block"
      panelProps={{ 'data-test-subj': 'avatarSymbolPickerPopover' }}
    >
      <div
        css={css`
          width: 260px;
          max-height: 200px;
          overflow-y: auto;
          ${emojiFontStack}
        `}
      >
        <EuiFlexGroup wrap gutterSize="none">
          {AVATAR_EMOJIS.map((emoji) => (
            <EuiFlexItem key={emoji} grow={false}>
              <button
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                aria-label={emoji}
                aria-pressed={value === emoji}
                data-test-subj={`avatarSymbolOption-${emoji}`}
                css={[
                  emojiButtonBaseStyles,
                  css`
                    border-radius: ${euiTheme.border.radius.small};
                    background: ${value === emoji ? euiTheme.colors.lightShade : 'transparent'};
                    &:hover {
                      background: ${euiTheme.colors.lightShade};
                    }
                  `,
                ]}
              >
                {emoji}
              </button>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
