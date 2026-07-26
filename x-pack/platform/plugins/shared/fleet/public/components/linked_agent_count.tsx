/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiLinkAnchorProps } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';

import { buildPolicyIdOrVariantsKuery } from '../../common/services/version_specific_policies_utils';

import { useLink } from '../hooks';
import { AGENTS_PREFIX, UNPRIVILEGED_AGENT_KUERY, PRIVILEGED_AGENT_KUERY } from '../constants';

/**
 * Displays the provided `count` number as a link to the Agents list if it is greater than zero
 */
export const LinkedAgentCount = memo<
  Omit<EuiLinkAnchorProps, 'href'> & {
    count: number;
    agentPolicyId: string;
    showAgentText?: boolean;
    privilegeMode?: 'privileged' | 'unprivileged';
  }
>(({ count, agentPolicyId, showAgentText, privilegeMode, ...otherEuiLinkProps }) => {
  const { getHref } = useLink();
  const displayValue = showAgentText ? (
    <FormattedMessage
      id="xpack.fleet.agentPolicy.linkedAgentCountText"
      defaultMessage="{count, plural, one {# agent} other {# agents}}"
      values={{ count }}
    />
  ) : (
    count
  );

  return count > 0 && agentPolicyId ? (
    <EuiLink
      {...otherEuiLinkProps}
      href={getHref('agent_list', {
        // Same as server: exact parent policy or wildcard for version-specific (policy_id: id#*).
        // encodeURIComponent below ensures # in kuery doesn't break the URL.
        kuery: encodeURIComponent(
          `${buildPolicyIdOrVariantsKuery(agentPolicyId, `${AGENTS_PREFIX}.policy_id`)}${
            privilegeMode
              ? ` and ${
                  privilegeMode === 'unprivileged'
                    ? UNPRIVILEGED_AGENT_KUERY
                    : PRIVILEGED_AGENT_KUERY
                }`
              : ''
          }`
        ),
        showInactive: true,
      })}
      data-test-subj="LinkedAgentCountLink"
    >
      {displayValue}
    </EuiLink>
  ) : (
    <span
      data-test-subj={otherEuiLinkProps['data-test-subj']}
      className={otherEuiLinkProps.className}
    >
      {displayValue}
    </span>
  );
});
