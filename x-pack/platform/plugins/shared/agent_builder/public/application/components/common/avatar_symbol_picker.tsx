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
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AVATAR_EMOJIS } from '../../utils/avatar_emojis';

const EMOJI_FONT_STACK = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";

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
  'data-test-subj': dataTestSubj = 'avatarSymbolPicker',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const pickerPlaceholder = i18n.translate(
    'xpack.agentBuilder.agents.form.avatarSymbolPlaceholder',
    {
      defaultMessage: 'Pick an emoji',
    }
  );

  const emojiGridStyles = css`
    width: 260px;
    max-height: 200px;
    overflow-y: auto;
    font-family: ${EMOJI_FONT_STACK};
  `;

  const emojiButtonStyles = (isSelected: boolean) =>
    css`
      font-family: ${EMOJI_FONT_STACK};
      font-size: 20px;
      min-width: 32px;
      ${isSelected ? `background-color: ${euiTheme.colors.lightShade};` : ''}
    `;

  const triggerStyles = css`
    cursor: ${disabled ? 'not-allowed' : 'pointer'};
    font-family: ${value ? EMOJI_FONT_STACK : 'inherit'};
  `;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiPopover
          button={
            <EuiFieldText
              value={value}
              placeholder={pickerPlaceholder}
              readOnly
              disabled={disabled}
              isInvalid={isInvalid}
              onClick={() => !disabled && setIsOpen((open) => !open)}
              css={triggerStyles}
              aria-label={
                ariaLabel ??
                i18n.translate('xpack.agentBuilder.agents.form.avatarSymbolAriaLabel', {
                  defaultMessage: 'Agent avatar symbol input field',
                })
              }
              aria-expanded={isOpen}
              data-test-subj={dataTestSubj}
            />
          }
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          anchorPosition="downRight"
          panelPaddingSize="s"
          data-test-subj={`${dataTestSubj}Popover`}
        >
          <div css={emojiGridStyles} data-test-subj={`${dataTestSubj}Grid`}>
            <EuiFlexGroup wrap gutterSize="xs">
              {AVATAR_EMOJIS.map((emoji) => (
                <EuiFlexItem key={emoji} grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    onClick={() => {
                      onChange(emoji);
                      setIsOpen(false);
                    }}
                    css={emojiButtonStyles(value === emoji)}
                    data-test-subj={`${dataTestSubj}Emoji-${emoji}`}
                    aria-pressed={value === emoji}
                  >
                    {emoji}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        </EuiPopover>
      </EuiFlexItem>
      {value && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
            color="text"
            onClick={() => onChange('')}
            disabled={disabled}
            aria-label={i18n.translate(
              'xpack.agentBuilder.agents.form.avatarSymbolClearAriaLabel',
              {
                defaultMessage: 'Clear avatar symbol',
              }
            )}
            data-test-subj={`${dataTestSubj}Clear`}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
