/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { Agent } from '../../../common/types/domain_data';

export const PolicySection: SFC<{ agent: Agent }> = ({ agent }) => (
  <div>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.fleet.agentDetails.policySectionTitle"
          defaultMessage="Policy"
        />
      </h3>
    </EuiTitle>
    <EuiText size="s" color="subdued">
      <FormattedMessage
        id="xpack.fleet.agentDetails.policySectionSubtitle"
        defaultMessage="Currently assigned policy"
      />
    </EuiText>
    <EuiSpacer size="m" />
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={null}>
        <EuiText>{agent.policy_id}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={null}>
        <EuiLink href={'/TODO/link'}>
          <FormattedMessage id="xpack.fleet.agentDetails.viewPolicyButtom" defaultMessage="View" />
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);
