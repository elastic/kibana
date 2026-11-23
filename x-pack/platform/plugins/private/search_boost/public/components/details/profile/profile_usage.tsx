/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { BoostProfile, BoostRuleListItem } from '../../../../common/types';
import type { LinkProps } from '../../../types';
import { formatStorageSize } from '../../format';
import { DetailsSection } from '../details_section';
import { SettingsList } from '../settings_list';
import { getUsage } from '../../usage';
import {
  PROFILE_APPLIES_TO_INFO,
  PROFILE_COLUMNS,
  RULE_COLUMNS,
  STORAGE_SIZE_LABEL,
  USAGE_TITLE,
  formatTargetCount,
  getRulesLinkLabel,
} from '../../../translations';

export interface ProfileUsageProps {
  profile: BoostProfile;
  /** The boost rules that use the profile. */
  rules: BoostRuleListItem[];
  /** Links to the "Boost rules" tab filtered by the profile. */
  getRulesListLinkProps: (profileName: string) => LinkProps;
}

export const ProfileUsage = ({ profile, rules, getRulesListLinkProps }: ProfileUsageProps) => {
  const usage = getUsage(rules.flatMap(({ matches }) => matches));

  return (
    <DetailsSection title={USAGE_TITLE} data-test-subj="searchBoostProfileUsage">
      <SettingsList
        items={[
          {
            id: 'rulesUsing',
            label: PROFILE_COLUMNS.rulesUsing,
            value:
              rules.length > 0 ? (
                <EuiLink
                  {...getRulesListLinkProps(profile.name)}
                  aria-label={getRulesLinkLabel(rules.length, profile.name)}
                >
                  {rules.length}
                </EuiLink>
              ) : (
                0
              ),
          },
          {
            id: 'appliesTo',
            label: RULE_COLUMNS.appliesTo,
            info: PROFILE_APPLIES_TO_INFO,
            value: formatTargetCount(profile.type, usage.appliesTo),
          },
          {
            id: 'storageSize',
            label: STORAGE_SIZE_LABEL,
            value: formatStorageSize(usage.storageSizeInBytes),
          },
        ]}
      />
    </DetailsSection>
  );
};
