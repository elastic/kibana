/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from '../../common';

/**
 * A display-only target for a space avatar.
 *
 * Avatars render both real spaces and synthetic entries (e.g. the "all spaces"
 * `*` pseudo-entry or an unresolved namespace shown by its raw id), so the `id`
 * here is intentionally a plain display `string` rather than `Space['id']`.
 * Decoupling avatar rendering from `Space['id']` is a prerequisite for branding
 * `Space['id']` as a nominal `SpaceId`
 * (see https://github.com/elastic/kibana-team/issues/3680).
 */
export type SpaceAvatarTarget = Partial<Omit<Space, 'id'>> & { id?: string };

/**
 * Properties for the SpaceAvatar component.
 */
export interface SpaceAvatarProps {
  /** The space to represent with an avatar. */
  space: SpaceAvatarTarget;

  /** The size of the avatar. */
  size?: 's' | 'm' | 'l' | 'xl';

  /** Optional CSS class(es) to apply. */
  className?: string;

  /**
   * When enabled, allows EUI to provide an aria-label for this component, which is announced on screen readers.
   *
   * Default value is true.
   */
  announceSpaceName?: boolean;

  /**
   * Whether or not to render the avatar in a disabled state.
   *
   * Default value is false.
   */
  isDisabled?: boolean;

  /**
   * Callback to be invoked when the avatar is clicked.
   */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;

  /**
   * Callback to be invoked when the avatar is clicked via keyboard.
   */
  onKeyPress?: (event: React.KeyboardEvent<HTMLDivElement>) => void;

  /**
   * Style props for the avatar.
   */
  style?: React.CSSProperties;
}
