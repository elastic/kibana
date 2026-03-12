/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiFieldSearch,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const modalStyles = css`
  width: 500px;
`;

const searchInputStyles = css`
  width: 100%;
`;

interface CommandPaletteModalProps {
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'commandPaletteModal' });

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      css={modalStyles}
      data-test-subj="agentBuilderCommandPaletteModal"
    >
      <EuiModalHeader>
        <EuiFieldSearch
          placeholder={i18n.translate('xpack.agentBuilder.commandPalette.searchPlaceholder', {
            defaultMessage: 'Search...',
          })}
          fullWidth
          autoFocus
          css={searchInputStyles}
          data-test-subj="agentBuilderCommandPaletteSearch"
          aria-label={i18n.translate('xpack.agentBuilder.commandPalette.searchAriaLabel', {
            defaultMessage: 'Search commands and actions',
          })}
        />
      </EuiModalHeader>
      <EuiModalBody>
        <p>
          {i18n.translate('xpack.agentBuilder.commandPalette.placeholder', {
            defaultMessage: 'Command palette content will go here',
          })}
        </p>
      </EuiModalBody>
    </EuiModal>
  );
};
