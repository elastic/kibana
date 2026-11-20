/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';

import type { BoostProfile, BoostProfileType } from '../../../common/types';
import { MANAGED_PROFILE_BADGE, PROFILE_TYPE_LABELS } from '../../translations';

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

/** Profiles grouped by type and sorted by name, with Elastic-managed ones marked. */
export const getProfileOptions = (
  profiles: readonly BoostProfile[],
  lockedType?: BoostProfileType
): Array<EuiComboBoxOptionOption<string>> =>
  PROFILE_TYPES.filter((type) => !lockedType || type === lockedType)
    .map((type) => ({
      label: PROFILE_TYPE_LABELS[type],
      options: profiles
        .filter((profile) => profile.type === type)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ name, is_builtin: isBuiltin }) => ({
          label: name,
          key: name,
          append: isBuiltin ? (
            <EuiBadge color="hollow">{MANAGED_PROFILE_BADGE}</EuiBadge>
          ) : undefined,
          'data-test-subj': `searchBoostRuleFlyoutProfileOption-${name}`,
        })),
    }))
    .filter(({ options }) => options.length > 0);

/** The selected profile as shown in the field, with its type. */
export const getSelectedProfileOptions = (
  profile?: BoostProfile
): Array<EuiComboBoxOptionOption<string>> =>
  profile
    ? [
        {
          label: profile.name,
          key: profile.name,
          append: (
            <EuiBadge color="hollow" data-test-subj="searchBoostRuleFlyoutProfileType">
              {PROFILE_TYPE_LABELS[profile.type]}
            </EuiBadge>
          ),
        },
      ]
    : [];
