/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../../templates/translations';

export interface TemplateFlyoutProps {
  onClose: () => void;
  onImport: () => void;
}

export const TemplateFlyout = React.memo<TemplateFlyoutProps>(({ onClose, onImport }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyout onClose={onClose} aria-label={i18n.IMPORT_TEMPLATE} data-test-subj="template-flyout">
      <EuiFlyoutHeader data-test-subj="template-flyout-header" hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.IMPORT_TEMPLATE}</h2>
        </EuiTitle>
        <EuiText
          css={css`
            margin-top: ${euiTheme.size.s};
            color: ${euiTheme.colors.textSubdued};
            font-size: ${euiTheme.size.m};
            font-weight: ${euiTheme.font.weight.regular};
            line-height: ${euiTheme.size.l};
          `}
        >
          <p>{i18n.IMPORT_TEMPLATE_DESCRIPTION}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{/* Empty flyout body */}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="primary"
              onClick={onClose}
              data-test-subj="template-flyout-cancel"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onImport} fill data-test-subj="template-flyout-import">
              {i18n.IMPORT_SELECTED}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});

TemplateFlyout.displayName = 'TemplateFlyout';
