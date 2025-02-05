/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  UseEuiTheme,
  euiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../utils';
import { FlyoutContainerStyles } from './flyout.styles';

function fromExcludedClickTarget(event: Event) {
  for (
    let node: HTMLElement | null = event.target as HTMLElement;
    node !== null;
    node = node!.parentElement
  ) {
    if (
      node.classList!.contains(DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS) ||
      node.classList!.contains('euiBody-hasPortalContent') ||
      node.getAttribute('data-euiportal') === 'true'
    ) {
      return true;
    }
  }
  return false;
}

export function FlyoutContainer({
  isOpen,
  label,
  handleClose,
  isFullscreen,
  panelRef,
  panelContainerRef,
  children,
  customFooter,
  isInlineEditing,
}: {
  isOpen: boolean;
  handleClose: () => void;
  children: React.ReactElement | null;
  label: string;
  isFullscreen?: boolean;
  panelRef?: (el: HTMLDivElement) => void;
  panelContainerRef?: (el: HTMLDivElement) => void;
  customFooter?: React.ReactElement;
  isInlineEditing?: boolean;
}) {
  const [focusTrapIsEnabled, setFocusTrapIsEnabled] = useState(false);

  const closeFlyout = useCallback(() => {
    setFocusTrapIsEnabled(false);
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    if (!isInlineEditing) {
      if (isOpen) {
        document.body.style.overflow = isOpen ? 'hidden' : '';
      }
      return () => {
        if (isOpen) {
          setFocusTrapIsEnabled(false);
        }
        document.body.style.overflow = '';
      };
    }
  }, [isInlineEditing, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div ref={panelRef}>
      <EuiFocusTrap
        disabled={!focusTrapIsEnabled}
        clickOutsideDisables={false}
        onClickOutside={(event) => {
          if (isFullscreen || fromExcludedClickTarget(event)) {
            return;
          }
          closeFlyout();
        }}
        onEscapeKey={closeFlyout}
      >
        <div
          ref={panelContainerRef}
          role="dialog"
          aria-labelledby="lnsDimensionContainerTitle"
          css={[
            FlyoutContainerStyles,
            css`
              box-shadow: ${isInlineEditing ? 'none !important' : 'inherit'};
            `,
            DimensionContainerStyles.self,
          ]}
          onAnimationEnd={() => {
            if (isOpen) {
              // EuiFocusTrap interferes with animating elements with absolute position:
              // running this onAnimationEnd, otherwise the flyout pushes content when animating.
              // The EuiFocusTrap is disabled when inline editing as it causes bugs with comboboxes
              setFocusTrapIsEnabled(!Boolean(isInlineEditing));
            }
          }}
        >
          <EuiFlyoutHeader hasBorder css={DimensionContainerStyles.header}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {isInlineEditing && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="text"
                    data-test-subj="lns-indexPattern-dimensionContainerBack"
                    className="lnsDimensionContainer__backIcon"
                    onClick={closeFlyout}
                    iconType="sortLeft"
                    aria-label={i18n.translate('xpack.lens.dimensionContainer.closeConfiguration', {
                      defaultMessage: 'Close configuration',
                    })}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={true}>
                <EuiTitle size="xs">
                  <h2 id="lnsDimensionContainerTitle">{label}</h2>
                </EuiTitle>
              </EuiFlexItem>

              {!isInlineEditing && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="text"
                    data-test-subj="lns-indexPattern-dimensionContainerBack"
                    className="lnsDimensionContainer__backIcon"
                    onClick={closeFlyout}
                    iconType="cross"
                    aria-label={i18n.translate('xpack.lens.dimensionContainer.closeConfiguration', {
                      defaultMessage: 'Close configuration',
                    })}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <div
            className="eui-yScroll"
            css={css`
              flex: 1;
            `}
          >
            {children}
          </div>

          {customFooter || (
            <EuiFlyoutFooter css={DimensionContainerStyles.footer}>
              <EuiButtonEmpty
                flush="left"
                size="s"
                iconType={isInlineEditing ? 'sortLeft' : 'cross'}
                onClick={closeFlyout}
                data-test-subj="lns-indexPattern-dimensionContainerClose"
              >
                {isInlineEditing
                  ? i18n.translate('xpack.lens.dimensionContainer.back', {
                      defaultMessage: 'Back',
                    })
                  : i18n.translate('xpack.lens.dimensionContainer.close', {
                      defaultMessage: 'Close',
                    })}
              </EuiButtonEmpty>
            </EuiFlyoutFooter>
          )}
        </div>
      </EuiFocusTrap>
    </div>
  );
}

const DimensionContainerStyles = {
  self: (euiThemeContext: UseEuiTheme) => {
    return `
    // But with custom positioning to keep it within the sidebar contents
    max-width: none !important;
    left: 0;
    z-index: ${euiThemeContext.euiTheme.levels.menu};
    ${euiBreakpoint(euiThemeContext, ['m', 'l', 'xl'])} {
      height: 100% !important;
      position: absolute;
      top: 0 !important;
    }

    .lnsFrameLayout__sidebar-isFullscreen & {
      border-left: ${
        euiThemeContext.euiTheme.border.thin
      }; // Force border regardless of theme in fullscreen
      box-shadow: none;
    }
  `;
  },
  header: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${euiTheme.size.base};
  `,
  footer: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${euiTheme.size.base};
  `,
};
