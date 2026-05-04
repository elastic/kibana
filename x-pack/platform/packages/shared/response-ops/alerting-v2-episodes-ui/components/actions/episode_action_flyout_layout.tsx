/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  euiFullHeight,
} from '@elastic/eui';

export interface EpisodeActionFlyoutProps {
  onClose: () => void;
  dataTestSubj: string;
  ariaLabelledBy: string;
  titleId: string;
  title: ReactNode;
  titleDataTestSubj?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  /**
   * When true, render only the header/body/footer fragment without the outer
   * `EuiFlyout`. Use this when mounting through `overlays.openFlyout`, which
   * already provides the flyout shell — wrapping again would nest two flyouts.
   */
  embedded?: boolean;
}

export function EpisodeActionFlyout({
  onClose,
  dataTestSubj,
  ariaLabelledBy,
  titleId,
  title,
  titleDataTestSubj,
  subtitle,
  children,
  footer,
  embedded = false,
}: EpisodeActionFlyoutProps) {
  const body = (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId} data-test-subj={titleDataTestSubj}>
            {title}
          </h2>
        </EuiTitle>
        {subtitle}
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          ${euiFullHeight()}

          .euiFlyoutBody__overflowContent {
            ${euiFullHeight()}
          }
        `}
      >
        {children}
      </EuiFlyoutBody>
      {footer}
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={ariaLabelledBy}
      data-test-subj={dataTestSubj}
      size="s"
      paddingSize="m"
    >
      {body}
    </EuiFlyout>
  );
}

export interface EpisodeActionFlyoutFooterProps {
  onClose: () => void;
  onPrimaryClick: () => void;
  cancelLabel: string;
  primaryLabel: string;
  cancelTestSubj: string;
  primaryTestSubj: string;
  isPrimaryLoading: boolean;
  isPrimaryDisabled: boolean;
  isCancelDisabled?: boolean;
}

export function EpisodeActionFlyoutFooter({
  onClose,
  onPrimaryClick,
  cancelLabel,
  primaryLabel,
  cancelTestSubj,
  primaryTestSubj,
  isPrimaryLoading,
  isPrimaryDisabled,
  isCancelDisabled = false,
}: EpisodeActionFlyoutFooterProps) {
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onClose}
            flush="left"
            isDisabled={isCancelDisabled}
            data-test-subj={cancelTestSubj}
          >
            {cancelLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={onPrimaryClick}
            isLoading={isPrimaryLoading}
            isDisabled={isPrimaryDisabled}
            data-test-subj={primaryTestSubj}
          >
            {primaryLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
