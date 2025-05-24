/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
  EuiButton,
  EuiLink,
  EuiBetaBadge,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css, cx } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FlyoutWrapperProps } from './types';

const styles = {
  flyoutHeader: css`
    pointer-events: auto;
    background-color: ${euiThemeVars.euiColorEmptyShade};
  `,
  beaker: css`
    vertical-align: middle;
  `,
  flyoutBody: css`
  // styles needed to display extra drop targets that are outside of the config panel main area
  overflow-y: auto;
  padding-left: ${euiThemeVars.euiFormMaxWidth};
  margin-left: -${euiThemeVars.euiFormMaxWidth};
  pointer-events: none;
  .euiFlyoutBody__overflow {
    transform: initial;
    -webkit-mask-image: none;
    padding-left: inherit;
    margin-left: inherit;
   
    > * {
      pointer-events: auto;
    }
  }
  .euiFlyoutBody__overflowContent {
    padding: 0;
    block-size: 100%;
  }
`
}

export const FlyoutWrapper = ({
  children,
  isInlineFlyoutVisible,
  isScrollable,
  displayFlyoutHeader,
  language,
  isNewPanel,
  isSaveable,
  onCancel,
  navigateToLensEditor,
  onApply,
  isReadOnly,
}: FlyoutWrapperProps) => {
  return (
    <>
      {isInlineFlyoutVisible && displayFlyoutHeader && (
        <EuiFlyoutHeader
          hasBorder
          className={styles.flyoutHeader}
          data-test-subj="editFlyoutHeader"
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs" data-test-subj="inlineEditingFlyoutLabel">
                <h2>
                  <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      {i18n.translate('xpack.lens.config.showVisualizationLabel', {
                        defaultMessage: 'Configuration',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        title={i18n.translate('xpack.lens.config.experimentalLabelDataview.title', {
                          defaultMessage: 'Technical preview',
                        })}
                        content={i18n.translate(
                          'xpack.lens.config.experimentalLabelDataview.content',
                          {
                            defaultMessage:
                              'Inline editing currently offers limited configuration options.',
                          }
                        )}
                      >
                        <EuiBetaBadge
                          label=""
                          iconType="beaker"
                          size="s"
                          className={styles.beaker}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {navigateToLensEditor && !isReadOnly && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <EuiLink onClick={navigateToLensEditor} data-test-subj="navigateToLensEditorLink">
                    {i18n.translate('xpack.lens.config.editLinkLabel', {
                      defaultMessage: 'Edit in Lens',
                    })}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
      )}
      {isInlineFlyoutVisible && isReadOnly ? (
        <EuiCallOut
          title={i18n.translate('xpack.lens.config.readOnly', {
            defaultMessage: 'Read-only: Changes will be reverted on close',
          })}
          color="warning"
          iconType="warning"
          size="s"
        />
      ) : null}

      <EuiFlyoutBody
        className={cx('lnsEditFlyoutBody',styles.flyoutBody)}
      >
        {children}
      </EuiFlyoutBody>
      {isInlineFlyoutVisible && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                id="lnsCancelEditOnFlyFlyout"
                onClick={onCancel}
                flush="left"
                aria-label={i18n.translate('xpack.lens.config.cancelFlyoutAriaLabel', {
                  defaultMessage: 'Cancel applied changes',
                })}
                data-test-subj="cancelFlyoutButton"
              >
                <FormattedMessage
                  id="xpack.lens.config.cancelFlyoutLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {isReadOnly ? null : (
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={onApply}
                  fill
                  disabled={Boolean(isNewPanel) ? false : !isSaveable}
                  iconType="check"
                  data-test-subj="applyFlyoutButton"
                >
                  <FormattedMessage
                    id="xpack.lens.config.applyFlyoutLabel"
                    defaultMessage="Apply and close"
                  />
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
