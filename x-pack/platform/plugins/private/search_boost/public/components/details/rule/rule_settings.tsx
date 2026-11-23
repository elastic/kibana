/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiCode, EuiLink } from '@elastic/eui';
import type { BoostProfile, BoostRuleListItem } from '../../../../common/types';
import type { LinkProps } from '../../../types';
import { DetailsSection } from '../details_section';
import { SettingsList } from '../settings_list';
import {
  BOOST_PROFILE_LABEL,
  MANAGED_PROFILE_BADGE,
  PRIORITY_INFO,
  RULE_COLUMNS,
  SETTINGS_TITLE,
} from '../../../translations';

export interface RuleSettingsProps {
  rule: BoostRuleListItem;
  /** The rule's boost profile. */
  profile?: BoostProfile;
  getProfileLinkProps: (profileName: string) => LinkProps;
}

export const RuleSettings = ({ rule, profile, getProfileLinkProps }: RuleSettingsProps) => (
  <DetailsSection title={SETTINGS_TITLE} data-test-subj="searchBoostRuleSettings">
    <SettingsList
      items={[
        {
          id: 'profile',
          label: BOOST_PROFILE_LABEL,
          value: (
            <>
              <EuiLink {...getProfileLinkProps(rule.boost_profile)}>{rule.boost_profile}</EuiLink>
              {profile?.is_builtin && (
                <>
                  {' '}
                  <EuiBadge>{MANAGED_PROFILE_BADGE}</EuiBadge>
                </>
              )}
            </>
          ),
        },
        {
          id: 'targets',
          label: RULE_COLUMNS.targets,
          value: <EuiCode>{rule.index_pattern}</EuiCode>,
        },
        {
          id: 'priority',
          label: RULE_COLUMNS.priority,
          info: PRIORITY_INFO,
          value: rule.priority,
        },
      ]}
    />
  </DetailsSection>
);
