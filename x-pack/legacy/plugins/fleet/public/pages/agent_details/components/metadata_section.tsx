/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiText, EuiSpacer, EuiDescriptionList } from '@elastic/eui';
import React, { SFC } from 'react';
import { Agent } from '../../../../common/types/domain_data';

export const AgentMetadataSection: SFC<{ agent: Agent }> = ({ agent }) => {
  const mapMetadata = (obj: { [key: string]: string } | undefined) => {
    return Object.keys(obj || {}).map(key => ({
      title: key,
      description: obj ? obj[key] : '',
    }));
  };

  const items = mapMetadata(agent.local_metadata).concat(mapMetadata(agent.user_provided_metadata));

  return (
    <div>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.fleet.agentDetails.metadataSectionTitle"
            defaultMessage="Metadata"
          />
        </h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.fleet.agentDetails.metadataSectionSubtitle"
          defaultMessage="Agent metadata"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" compressed listItems={items} />
    </div>
  );
};
