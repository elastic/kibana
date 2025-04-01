/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useKibana } from '../hooks/use_kibana';

const bottomBarCss = css`
  animation: none !important; // disable the animation to prevent the footer from flickering
`;
const containerCss = css`
  min-height: 40px;
`;
const contentCss = css`
  width: 100%;
  max-width: 730px;
`;

interface ButtonsFooterProps {
  cancelButtonText?: React.ReactNode;
  nextButtonText?: React.ReactNode;
  backButtonText?: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  hideCancel?: boolean;
  isNextDisabled?: boolean;
}
export const ButtonsFooter = React.memo<ButtonsFooterProps>(
  ({
    cancelButtonText,
    nextButtonText,
    backButtonText,
    onNext,
    onBack,
    hideCancel = false,
    isNextDisabled = false,
  }) => {
    const integrationsUrl = useKibana().services.application.getUrlForApp('integrations');
    return (
      <KibanaPageTemplate.BottomBar paddingSize="s" position="sticky" css={bottomBarCss}>
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          css={containerCss}
          data-test-subj="buttonsFooter"
        >
          <EuiFlexItem css={contentCss}>
            <EuiFlexGroup
              direction="row"
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="l"
            >
              <EuiFlexItem>
                {!hideCancel && (
                  <EuiLink
                    href={integrationsUrl}
                    color="text"
                    data-test-subj="buttonsFooter-cancelButton"
                  >
                    {cancelButtonText || (
                      <FormattedMessage
                        id="xpack.automaticImport.footer.cancel"
                        defaultMessage="Cancel"
                      />
                    )}
                  </EuiLink>
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup
                  direction="row"
                  justifyContent="flexEnd"
                  alignItems="center"
                  gutterSize="l"
                >
                  <EuiFlexItem grow={false}>
                    {onBack && (
                      <EuiLink
                        onClick={onBack}
                        color="text"
                        data-test-subj="buttonsFooter-backButton"
                      >
                        {backButtonText || (
                          <FormattedMessage
                            id="xpack.automaticImport.footer.back"
                            defaultMessage="Back"
                          />
                        )}
                      </EuiLink>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {onNext && (
                      <EuiButton
                        fill
                        color="primary"
                        onClick={onNext}
                        isDisabled={isNextDisabled}
                        data-test-subj="buttonsFooter-nextButton"
                      >
                        {nextButtonText || (
                          <FormattedMessage
                            id="xpack.automaticImport.footer.next"
                            defaultMessage="Next"
                          />
                        )}
                      </EuiButton>
                    )}
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
