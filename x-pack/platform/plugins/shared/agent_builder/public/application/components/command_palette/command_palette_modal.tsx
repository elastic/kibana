/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiSelectable,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useCommandPaletteActions } from './use_command_palette_actions';

interface CommandPaletteModalProps {
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'commandPaletteModal' });
  const { euiTheme } = useEuiTheme();
  const [searchValue, setSearchValue] = useState('');
  const selectableOptions = useCommandPaletteActions({ onClose, searchQuery: searchValue });

  const handleChange = useCallback(
    (options: EuiSelectableOption[], _event: unknown, changedOption: EuiSelectableOption) => {
      const action = changedOption?.data?.action;
      if (action?.onSelect) {
        action.onSelect();
      }
    },
    []
  );

  const modalStyles = css`
    width: 650px;
  `;

  const modalHeaderStyles = css`
    padding: ${euiTheme.size.m};
    padding-inline-end: ${euiTheme.size.xl};
  `;

  const modalBodyStyles = css`
    padding: 0;

    .euiModalBody__overflow {
      padding: ${euiTheme.size.m};
      padding-block-start: 0;
      max-height: 500px;
    }
  `;

  const listStylesOverride = css`
    .euiSelectableListItem:not(:last-of-type) {
      border-block-end: 0;
    }
    .euiSelectableList__groupLabel {
      border-block-end: 0;
      font-size: ${euiTheme.size.m};
      font-weight: 400;
      color: ${euiTheme.colors.textSubdued};
      :not(:first-of-type) {
        padding-block-start: ${euiTheme.size.m};
      }
    }
    .euiSelectableList__list {
      mask-image: none;
    }
  `;

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      css={modalStyles}
      data-test-subj="agentBuilderCommandPaletteModal"
      outsideClickCloses
    >
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: i18n.translate('xpack.agentBuilder.commandPalette.searchPlaceholder', {
            defaultMessage: 'Search or start a chat',
          }),
          autoFocus: true,
          value: searchValue,
          onChange: (value) => setSearchValue(value),
          'data-test-subj': 'agentBuilderCommandPaletteSearch',
        }}
        isPreFiltered
        options={selectableOptions}
        onChange={handleChange}
        singleSelection
        listProps={{
          bordered: false,
          showIcons: false,
          onFocusBadge: false,
          isVirtualized: false,
        }}
        css={listStylesOverride}
        aria-label={i18n.translate('xpack.agentBuilder.commandPalette.searchAriaLabel', {
          defaultMessage: 'Search commands and actions',
        })}
        data-test-subj="agentBuilderCommandPaletteList"
      >
        {(list, search) => (
          <>
            <EuiModalHeader css={modalHeaderStyles}>
              <span id={modalTitleId} className="euiScreenReaderOnly">
                {i18n.translate('xpack.agentBuilder.commandPalette.title', {
                  defaultMessage: 'Command palette',
                })}
              </span>
              {search}
            </EuiModalHeader>
            <EuiModalBody css={modalBodyStyles}>{list}</EuiModalBody>
          </>
        )}
      </EuiSelectable>
    </EuiModal>
  );
};
