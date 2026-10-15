/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
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
  EuiSpacer,
  EuiText,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import { css, Global } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DRAG_DROP_EXTRA_TARGETS_WIDTH, DRAG_DROP_EXTRA_TARGETS_PADDING } from '@kbn/lens-common';
import type { FlyoutWrapperProps } from './types';

/**
 * Nested Emotion `css` on EuiFlyout often loses to EUI's own classes on
 * `.euiFlyout__content` / body overflow. Global + !important scoped to Lens
 * inline flyouts forces the classic "visible ancestors + one guttered scrollport" model.
 */
const inlineFlyoutDndOverflowFix = css`
  /* Must beat chrome-layout grid_global_app_style.tsx:
     body .euiFlyout[class*='right']:not([data-managed-flyout-layout-mode=…][data-managed-flyout-level=child])
     { clip-path: inset(0 0 0 -50% …) !important }
     That -50% only allows half the flyout width (~250px); DnD extras need ~296px. */
  body .euiFlyout[class*='right'][data-test-subj='customizeLens'],
  body .euiFlyout[class*='right'][data-test-subj='lnsEditOnFlyFlyout'],
  body .euiFlyout[class*='right'].kbnPresentationLazyFlyout,
  body
    .euiFlyout[class*='right'][data-test-subj='customizeLens']:not(
      [data-managed-flyout-layout-mode='side-by-side'][data-managed-flyout-level='child']
    ),
  body
    .euiFlyout[class*='right'].kbnPresentationLazyFlyout:not(
      [data-managed-flyout-layout-mode='side-by-side'][data-managed-flyout-level='child']
    ),
  .euiOverlayMask[data-relative-to-header='above']
    + [data-euiportal='true']
    .euiFlyout[class*='right'][data-test-subj='customizeLens'],
  .euiOverlayMask[data-relative-to-header='above']
    + [data-euiportal='true']
    .euiFlyout[class*='right'].kbnPresentationLazyFlyout {
    clip-path: none !important;
    overflow: visible !important;
  }

  .euiFlyout[data-test-subj='customizeLens'] [data-test-subj='euiFlyoutContent'],
  .euiFlyout[data-test-subj='customizeLens'] .euiFlyout__content,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] [data-test-subj='euiFlyoutContent'],
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .euiFlyout__content,
  .euiFlyout.kbnPresentationLazyFlyout [data-test-subj='euiFlyoutContent'],
  .euiFlyout.kbnPresentationLazyFlyout .euiFlyout__content,
  .euiFlyout[data-test-subj='customizeLens'] .kbnOverlayMountWrapper,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .kbnOverlayMountWrapper,
  .euiFlyout.kbnPresentationLazyFlyout .kbnOverlayMountWrapper,
  .euiFlyout[data-test-subj='customizeLens'] .lnsEditFlyoutBody,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .lnsEditFlyoutBody,
  .euiFlyout.kbnPresentationLazyFlyout .lnsEditFlyoutBody,
  .euiFlyout[data-test-subj='customizeLens'] .euiFlyoutBody__overflowContent,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .euiFlyoutBody__overflowContent,
  .euiFlyout.kbnPresentationLazyFlyout .euiFlyoutBody__overflowContent,
  .euiFlyout[data-test-subj='customizeLens'] .euiAccordion__childWrapper,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .euiAccordion__childWrapper,
  .euiFlyout.kbnPresentationLazyFlyout .euiAccordion__childWrapper {
    overflow: visible !important;
    overflow-x: visible !important;
    overflow-y: visible !important;
    overflow-block: visible !important;
    overflow-inline: visible !important;
  }

  .euiFlyout[data-test-subj='customizeLens'] .euiFlyoutBody__overflow,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .euiFlyoutBody__overflow,
  .euiFlyout.kbnPresentationLazyFlyout .euiFlyoutBody__overflow {
    overflow-x: hidden !important;
    overflow-y: auto !important;
    mask-image: none !important;
    -webkit-mask-image: none !important;
    transform: none !important;
    padding-left: ${DRAG_DROP_EXTRA_TARGETS_PADDING}px !important;
    margin-left: -${DRAG_DROP_EXTRA_TARGETS_PADDING}px !important;
  }

  .euiFlyout[data-test-subj='customizeLens'] .kbnOverlayMountWrapper,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .kbnOverlayMountWrapper,
  .euiFlyout.kbnPresentationLazyFlyout .kbnOverlayMountWrapper {
    padding-left: 400px !important;
    margin-left: -400px !important;
  }

  .euiFlyout[data-test-subj='customizeLens'] .domDroppable__extraTargets,
  .euiFlyout[data-test-subj='lnsEditOnFlyFlyout'] .domDroppable__extraTargets,
  .euiFlyout.kbnPresentationLazyFlyout .domDroppable__extraTargets {
    width: ${DRAG_DROP_EXTRA_TARGETS_WIDTH}px !important;
  }
`;

const applyAndCloseLabel = i18n.translate('xpack.lens.config.applyFlyoutLabel', {
  defaultMessage: 'Apply and close',
});

const closeConfigurationLabel = i18n.translate('xpack.lens.config.closeFlyoutAriaLabel', {
  defaultMessage: 'Close configuration',
});

export const FlyoutWrapper = ({
  children,
  toolbar,
  layerTabs,
  isInlineFlyoutVisible,
  isScrollable,
  displayFlyoutHeader,
  isSaveable,
  onCancel,
  navigateToLensEditor,
  onApply,
  isReadOnly,
  applyButtonLabel = applyAndCloseLabel,
  applyButtonDisabledTooltip,
}: FlyoutWrapperProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <Global styles={inlineFlyoutDndOverflowFix} />
      {isInlineFlyoutVisible && displayFlyoutHeader && (
        <EuiFlyoutHeader
          hasBorder={false}
          css={css`
            pointer-events: auto;
            background-color: ${euiTheme.colors.emptyShade};
          `}
          data-test-subj="editFlyoutHeader"
        >
          {/* Header row 1: Title + close (same onCancel as footer Cancel) */}
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
                          tabIndex={0}
                          label=""
                          iconType="flask"
                          size="s"
                          css={css`
                            vertical-align: middle;
                          `}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={closeConfigurationLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  color="text"
                  iconType="cross"
                  onClick={onCancel}
                  data-test-subj="euiFlyoutCloseButton"
                  aria-label={closeConfigurationLabel}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          {/* Header row 2: Edit in Lens and button groups */}
          {(navigateToLensEditor || toolbar) && (
            <>
              <EuiFlexGroup
                gutterSize="xs"
                justifyContent="spaceBetween"
                alignItems="center"
                responsive={false}
              >
                {navigateToLensEditor && !isReadOnly && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <EuiLink
                        onClick={navigateToLensEditor}
                        data-test-subj="navigateToLensEditorLink"
                      >
                        {i18n.translate('xpack.lens.config.editLinkLabel', {
                          defaultMessage: 'Edit in Lens',
                        })}
                      </EuiLink>
                    </EuiText>
                  </EuiFlexItem>
                )}
                {/* Empty growing flex item to push toolbar to the right */}
                <EuiFlexItem grow={true} />
                {toolbar ?? null}
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          )}
          {/* Header row 3: Layer tabs */}
          {layerTabs ? (
            <div
              // Adding negative margin to compensate for EuiFlyout header padding
              css={css({
                marginInline: `-${euiTheme.size.base}`,
              })}
            >
              {layerTabs}
            </div>
          ) : null}
        </EuiFlyoutHeader>
      )}
      {isInlineFlyoutVisible && isReadOnly ? (
        <EuiCallOut
          announceOnMount={false}
          title={i18n.translate('xpack.lens.config.readOnly', {
            defaultMessage: 'Read-only: Changes will be reverted on close',
          })}
          color="warning"
          iconType="warning"
          size="s"
        />
      ) : null}

      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          // Visible on the body so extras can reach the __overflow gutter. Scrolling lives
          // on __overflow only (classic Lens: one scrollport with a left gutter).
          overflow: visible !important;
          pointer-events: none;
          .domDroppable__extraTargets {
            width: ${DRAG_DROP_EXTRA_TARGETS_WIDTH}px;
          }
          .euiFlyoutBody__overflow {
            // Override euiYScroll (overflow-x: hidden + mask). Keep y-scroll; reserve left
            // gutter so absolute DnD UI stays inside this clipport.
            transform: none !important;
            mask-image: none !important;
            -webkit-mask-image: none !important;
            padding-left: ${DRAG_DROP_EXTRA_TARGETS_PADDING}px !important;
            margin-left: -${DRAG_DROP_EXTRA_TARGETS_PADDING}px !important;
            overflow-x: hidden !important;
            overflow-y: ${isScrollable ? 'auto' : 'hidden'} !important;
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            background-color: ${euiTheme.colors.emptyShade};
            padding: 0;
            overflow: visible !important;
          }
        `}
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
                <EuiToolTip
                  content={applyButtonDisabledTooltip}
                  display={applyButtonDisabledTooltip ? 'inlineBlock' : 'block'}
                >
                  <EuiButton
                    onClick={onApply}
                    fill
                    disabled={!isSaveable}
                    hasAriaDisabled
                    iconType="check"
                    data-test-subj="applyFlyoutButton"
                  >
                    {applyButtonLabel}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
