/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiText,
  EuiFlexItem,
  EuiFlexGrid,
  EuiLink
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

export function NoSupportedClusters() {
  return (
    <EuiFlexGrid>
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.noSupportedClusters"
              defaultMessage={`We have detected monitoring data, but none of the detected clusters are supported
              in the UI due to invalid or unsupported licenses. Please double check the licenses on all clusters.`}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="eui-textCenter">
        <EuiLink
          href={`${ELASTIC_WEBSITE_URL}guide/en/elastic-stack-overview/${DOC_LINK_VERSION}/monitoring-production.html`}
          target="_blank"
        >
          <FormattedMessage
            id="xpack.monitoring.noData.noSupportedClustersLink"
            defaultMessage="Read more about licensing in the stack monitoring UI."
          />
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
}
