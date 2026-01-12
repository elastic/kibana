/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';

const bottomBarCss = css`
  animation: none !important; // disable the animation to prevent the footer from flickering
`;
const contentCss = css`
  width: 100%;
`;

interface ButtonsFooterProps {
  cancelButtonText?: React.ReactNode;
  actionButtonText?: React.ReactNode;
  onAction?: () => void;
  onCancel?: () => void;
  hideCancel?: boolean;
  isActionDisabled?: boolean;
  isActionLoading?: boolean;
}
export const ButtonsFooter = React.memo<ButtonsFooterProps>(
  ({
    cancelButtonText,
    actionButtonText,
    onAction,
    onCancel,
    hideCancel = false,
    isActionDisabled = false,
    isActionLoading = false,
  }) => {
    return (
      <KibanaPageTemplate.BottomBar paddingSize="m" position="fixed" css={bottomBarCss}>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem css={contentCss}>
            <EuiFlexGroup
              direction="row"
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="l"
            >
              <EuiFlexItem>
                <EuiFlexGroup
                  direction="row"
                  justifyContent="flexEnd"
                  alignItems="center"
                  gutterSize="l"
                >
                  <EuiFlexItem grow={false}>
                    {!hideCancel && (
                      <EuiButtonEmpty
                        color="text"
                        onClick={onCancel}
                        data-test-subj="buttonsFooter-cancelButton"
                      >
                        {cancelButtonText || (
                          <FormattedMessage
                            id="xpack.automaticImportV2.footer.cancel"
                            defaultMessage="Cancel"
                          />
                        )}
                      </EuiButtonEmpty>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      color="primary"
                      onClick={onAction}
                      isDisabled={isActionDisabled}
                      isLoading={isActionLoading}
                      data-test-subj="buttonsFooter-actionButton"
                    >
                      {actionButtonText || (
                        <FormattedMessage
                          id="xpack.automaticImportV2.footer.action"
                          defaultMessage="Done"
                        />
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.BottomBar>
    );
  }
);
ButtonsFooter.displayName = 'ButtonsFooter';
