/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from '../../common';

/**
 * Values used in the "Customize Space" form.
 *
 * The `id` is intentionally a plain `string` (not `Space['id']`): while the form
 * is being filled in it holds an in-progress, not-yet-validated identifier. It is
 * validated and narrowed to a real space id only at the save boundary. Keeping it
 * decoupled from `Space['id']` is a prerequisite for branding `Space['id']` as a
 * nominal `SpaceId` (see https://github.com/elastic/kibana-team/issues/3680).
 */
export interface CustomizeSpaceFormValues extends Partial<Omit<Space, 'id'>> {
  id?: string;
  customIdentifier?: boolean;
  avatarType?: 'initials' | 'image';
  customAvatarInitials?: boolean;
  customAvatarColor?: boolean;
}
