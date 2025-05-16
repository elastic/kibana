/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { type State } from '../../state';
import * as i18n from './translations';

interface FooterProps {
  isFlyoutGenerating: State['isFlyoutGenerating'];
  isValid: boolean;
  isGenerationComplete: boolean;
  showHint: boolean;
  hint: string;
  onCancel: () => void;
  onSave: () => void;
}

export const Footer = React.memo<FooterProps>(
  ({ isFlyoutGenerating, isValid, isGenerationComplete, showHint, hint, onSave, onCancel }) => {
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} flush="left" data-test-subj="footer-cancelButton">
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {showHint && (
            <EuiText size="s" data-test-subj="footer-showHint">
              {hint}
            </EuiText>
          )}
          <EuiButton
            fill={isGenerationComplete}
            color="primary"
            onClick={onSave}
            isDisabled={isFlyoutGenerating || !isValid}
            data-test-subj="footer-saveButton"
          >
            {i18n.SAVE_CONFIG}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  }
);
Footer.displayName = 'Footer';
