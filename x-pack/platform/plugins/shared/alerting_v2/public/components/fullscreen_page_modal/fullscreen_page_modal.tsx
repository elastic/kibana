/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiTitle,
  EuiToolTip,
  euiShadowXSmall,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export interface FullscreenPageModalProps {
  title: string;
  backLabel: string;
  onClose: () => void;
  children: ReactNode;
  headerActions?: ReactNode;
  /**
   * Optional sidebar (Version history–style panel). When set, the modal uses a
   * split layout with the main preview shell and this panel.
   */
  sidebar?: ReactNode;
  /** Title shown in the sidebar header. Required when `sidebar` is set. */
  sidebarTitle?: string;
  /**
   * Which side the sidebar sits on. Defaults to `start` (left in LTR) to match
   * Version history; use `end` for Get started–style right nav.
   */
  sidebarSide?: 'start' | 'end';
  /** When set (and no sidebar), centers header + body content to this max width. */
  maxContentWidth?: number;
  'data-test-subj'?: string;
}

const CLOSE_LABEL = i18n.translate('xpack.alertingV2.fullscreenPageModal.close', {
  defaultMessage: 'Close',
});

/**
 * Full-viewport page modal matching the Rule version history shell:
 * edge-to-edge EuiModal with a back control, title, and content panel.
 * Optional left sidebar matches the Version history sidebar panel chrome.
 */
export const FullscreenPageModal = ({
  title,
  backLabel,
  onClose,
  children,
  headerActions,
  sidebar,
  sidebarTitle,
  sidebarSide = 'start',
  maxContentWidth,
  'data-test-subj': dataTestSubj = 'fullscreenPageModal',
}: FullscreenPageModalProps): JSX.Element => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const titleId = useGeneratedHtmlId();
  const hasSidebar = Boolean(sidebar);

  const styles = useMemo(
    () => ({
      modal: css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        block-size: 100vh;
        max-block-size: 100vh !important;
        inline-size: 100vw !important;
        max-inline-size: none !important;
        min-inline-size: 0 !important;
        border-radius: 0;

        .euiModal__closeIcon {
          display: none;
        }
      `,
      modalBody: css`
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;

        &:last-of-type .euiModalBody__overflow {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: ${euiTheme.size.s};
          padding-block-end: ${euiTheme.size.s};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }
      `,
      splitLayout: css`
        flex: 1;
        min-height: 0;
        height: 100%;
        display: flex;
        flex-direction: ${sidebarSide === 'end' ? 'row-reverse' : 'row'};
        align-items: stretch;
        gap: ${euiTheme.size.s};
        overflow: hidden;
      `,
      sidebarPanel: css`
        flex: 0 0 380px;
        width: 380px;
        align-self: stretch;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.small};
        overflow: hidden;
      `,
      sidebarHeader: css`
        flex-shrink: 0;
        padding: ${euiTheme.size.base};
        border-bottom: ${euiTheme.border.thin};
      `,
      sidebarHeaderSeparator: css`
        width: 1px;
        align-self: stretch;
        min-height: ${euiTheme.size.l};
        background-color: ${euiTheme.colors.borderBasePlain};
      `,
      sidebarBody: css`
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        padding: ${euiTheme.size.base};
      `,
      shell: css`
        flex: 1 1 auto;
        align-self: stretch;
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: ${euiTheme.colors.backgroundBasePlain};
        border-radius: ${euiTheme.border.radius.small};
        ${euiShadowXSmall(euiThemeContext, { border: 'none' })}
        overflow: hidden;
      `,
      header: css`
        flex-shrink: 0;
        padding: ${euiTheme.size.m} ${euiTheme.size.l};
      `,
      body: css`
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        padding: 0 ${euiTheme.size.l} ${euiTheme.size.l};
      `,
      contentColumn: css`
        ${!hasSidebar && maxContentWidth
          ? `
          max-inline-size: ${maxContentWidth}px;
          margin-inline: auto;
          inline-size: 100%;
        `
          : ''}
      `,
      bodyContent: css`
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      `,
    }),
    [euiTheme, euiThemeContext, hasSidebar, maxContentWidth, sidebarSide]
  );

  const mainShell = (
    <div css={styles.shell} data-test-subj={`${dataTestSubj}Main`}>
      <div css={styles.header}>
        <div css={styles.contentColumn}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem>
              <EuiFlexGroup
                direction="column"
                gutterSize="xs"
                alignItems="flexStart"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="chevronSingleLeft"
                    flush="left"
                    onClick={onClose}
                    data-test-subj={`${dataTestSubj}Back`}
                  >
                    {backLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="m">
                    <h1 id={titleId}>{title}</h1>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {headerActions ? <EuiFlexItem grow={false}>{headerActions}</EuiFlexItem> : null}
          </EuiFlexGroup>
        </div>
      </div>
      <div css={styles.body}>
        <div css={[styles.contentColumn, styles.bodyContent]}>{children}</div>
      </div>
    </div>
  );

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={false}
      css={styles.modal}
      data-test-subj={dataTestSubj}
      aria-labelledby={titleId}
    >
      <EuiModalBody css={styles.modalBody}>
        {hasSidebar ? (
          <div css={styles.splitLayout}>
            <div css={styles.sidebarPanel} data-test-subj={`${dataTestSubj}Sidebar`}>
              <div css={styles.sidebarHeader}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={true}>
                    <EuiTitle size="xxs">
                      <h2>{sidebarTitle}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <div css={styles.sidebarHeaderSeparator} aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={CLOSE_LABEL} disableScreenReaderOutput>
                          <EuiButtonIcon
                            iconType="cross"
                            size="s"
                            aria-label={CLOSE_LABEL}
                            color="text"
                            onClick={onClose}
                            data-test-subj={`${dataTestSubj}Close`}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
              <div css={styles.sidebarBody}>{sidebar}</div>
            </div>
            {mainShell}
          </div>
        ) : (
          mainShell
        )}
      </EuiModalBody>
    </EuiModal>
  );
};
