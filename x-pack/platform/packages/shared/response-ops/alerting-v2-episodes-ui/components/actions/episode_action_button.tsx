/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';

/**
 * Props for {@link EpisodeActionButton}.
 *
 * Explicitly enumerates the props shared by `EuiButton` and `EuiButtonEmpty`
 * that episode action buttons use, avoiding EUI's discriminated union between
 * button and anchor variants which prevents generic spreading.
 */
export interface EpisodeActionButtonProps {
  /**
   * When `true` (default), renders a bordered `EuiButton` with `fill={false}`.
   * When `false`, renders an `EuiButtonEmpty` for borderless text-style actions.
   */
  outlined?: boolean;
  size?: 's' | 'm';
  color?: 'text' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  iconType?: IconType;
  onClick?: React.MouseEventHandler;
  href?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
  'aria-label'?: string;
  'data-test-subj'?: string;
  css?: Interpolation<Theme>;
  className?: string;
}

/**
 * Wrapper around `EuiButton` / `EuiButtonEmpty` that centralises the
 * outlined-vs-borderless branching logic for episode action buttons.
 *
 * All action buttons rendered inside {@link AlertEpisodeActions} should use
 * this component instead of importing `EuiButton` or `EuiButtonEmpty` directly.
 */
export const EpisodeActionButton = ({ outlined = true, ...rest }: EpisodeActionButtonProps) => {
  return outlined ? <EuiButton {...rest} fill={false} /> : <EuiButtonEmpty {...rest} />;
};
