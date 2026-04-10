/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';

interface ConfirmRemoveConfig {
  title: string;
  body: string;
  confirmButtonText: string;
  cancelButtonText: string;
  onConfirm: () => void;
}

export interface DetailPanelLayoutProps {
  isLoading: boolean;
  isEmpty: boolean;
  title: string;
  isReadOnly?: boolean;
  headerActions: (openConfirmRemove: () => void) => React.ReactNode;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  confirmRemove?: ConfirmRemoveConfig;
}

export const DetailPanelLayout: React.FC<DetailPanelLayoutProps> = ({
  isLoading,
  isEmpty,
  title,
  isReadOnly = false,
  headerActions,
  headerContent,
  children,
  confirmRemove,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const openConfirmRemove = () => setIsConfirmOpen(true);

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={css`
          padding: ${euiTheme.size.xxl};
        `}
      >
        <EuiLoadingSpinner size="l" />
      </EuiFlexGroup>
    );
  }

  if (isEmpty) return null;

  return (
    <div
      css={css`
        height: 100%;
        padding: 0;
      `}
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          height: 100%;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.size.xs};
        `}
      >
        {/* Header: pinned at top, does not scroll */}
        <div
          css={css`
            flex-shrink: 0;
            padding: ${euiTheme.size.l};
            border-bottom: ${euiTheme.border.thin};
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>{title}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                {isReadOnly && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {labels.byAuthor('Elastic')}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{headerActions(openConfirmRemove)}</EuiFlexItem>
          </EuiFlexGroup>
          {headerContent}
        </div>

        {/* Body: fills remaining height and scrolls on overflow */}
        <div
          css={css`
            flex: 1;
            min-height: 0;
            overflow-y: auto;
          `}
        >
          {children}
        </div>
      </div>

      {confirmRemove && isConfirmOpen && (
        <EuiConfirmModal
          title={confirmRemove.title}
          aria-label={confirmRemove.title}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            confirmRemove.onConfirm();
          }}
          cancelButtonText={confirmRemove.cancelButtonText}
          confirmButtonText={confirmRemove.confirmButtonText}
          buttonColor="danger"
        >
          <p>{confirmRemove.body}</p>
        </EuiConfirmModal>
      )}
    </div>
  );
};
