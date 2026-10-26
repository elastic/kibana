/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent, ReactNode } from 'react';
import React from 'react';
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common/constants';
import { BUILTIN_PROFILES } from '../../../common/presets';
import type { BoostRule } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { DEFAULT_BADGE_LABEL, MANAGED_BADGE_LABEL } from '../badge_labels';
import { getProfileDetailsPath, getRuleDetailsPath } from '../details_link';
import { isModifiedClick } from '../is_modified_click';

/** A page of the boost app, from outside it: its URL, and a click handler that opens it in Kibana. */
const useBoostPageLink = (path: string) => {
  const { application } = useBoostServices();
  const href = application.getUrlForApp('management', { path: `/data/${PLUGIN_ID}${path}` });
  return {
    href,
    onClick: (event: MouseEvent) => {
      if (isModifiedClick(event)) {
        return;
      }
      event.preventDefault();
      application.navigateToUrl(href);
    },
  };
};

interface Badge {
  label: string;
  color?: EuiBadgeProps['color'];
}

/** A name, with badges after it when there are any. */
const WithBadges = ({ children, badges }: { children: ReactNode; badges: readonly Badge[] }) =>
  badges.length > 0 ? (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      {badges.map(({ label, color }) => (
        <EuiFlexItem key={label} grow={false}>
          <EuiBadge color={color}>{label}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : (
    <>{children}</>
  );

const APPLIES_BADGE_LABEL = i18n.translate('xpack.boost.indexManagement.appliesBadge', {
  defaultMessage: 'Applies',
});

const isBuiltinProfile = (profileName: string) =>
  BUILTIN_PROFILES.some(({ name }) => name === profileName);

/** A profile's name, linking to its page in the boost app, and marked when Elastic manages it. */
export const ProfileLink = ({ profileName }: { profileName: string }) => {
  const link = useBoostPageLink(getProfileDetailsPath(profileName));
  return (
    <WithBadges badges={isBuiltinProfile(profileName) ? [{ label: MANAGED_BADGE_LABEL }] : []}>
      <EuiLink {...link} data-test-subj="boostExplanationProfile">
        {profileName}
      </EuiLink>
    </WithBadges>
  );
};

interface RuleLinkProps {
  rule: BoostRule;
  /** Marks the rule that applies, among others that match. */
  isApplied?: boolean;
}

/**
 * A rule's name, linking to its page in the boost app, and marked when it's a default rule, and
 * when it's the one that applies.
 */
export const RuleLink = ({
  rule: { name, is_builtin: isDefault },
  isApplied = false,
}: RuleLinkProps) => {
  const link = useBoostPageLink(getRuleDetailsPath(name));
  return (
    <WithBadges
      badges={[
        ...(isDefault ? [{ label: DEFAULT_BADGE_LABEL }] : []),
        ...(isApplied ? [{ label: APPLIES_BADGE_LABEL, color: 'success' }] : []),
      ]}
    >
      <EuiLink {...link} data-test-subj="boostExplanationRule">
        {name}
      </EuiLink>
    </WithBadges>
  );
};
