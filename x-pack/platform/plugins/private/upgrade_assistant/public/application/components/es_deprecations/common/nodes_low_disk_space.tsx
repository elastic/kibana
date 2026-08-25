/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  nodes: Array<{
    nodeId: string;
    nodeName: string;
    available: string;
  }>;
}
export const NodesLowSpaceCallOut: React.FunctionComponent<Props> = ({ nodes }) => {
  return (
    <>
      <KbnWarningCallout
        data-test-subj="lowDiskSpaceCallout"
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.common.warning.lowDiskSpaceCalloutTitle"
            defaultMessage="Nodes with low disk space"
          />
        }
      >
        <>
          <FormattedMessage
            id="xpack.upgradeAssistant.common.warning.lowDiskSpaceCalloutDescription"
            defaultMessage="Disk usage has exceeded the low watermark, which may prevent migration. The following nodes are impacted:"
          />

          <EuiSpacer size="s" />

          <ul>
            {nodes.map(({ nodeName, available, nodeId }) => (
              <li key={nodeId} data-test-subj="impactedNodeListItem">
                <FormattedMessage
                  id="xpack.upgradeAssistant.common.warning.lowDiskSpaceUsedText"
                  defaultMessage="{nodeName} ({available} available)"
                  values={{
                    nodeName,
                    available,
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      </KbnWarningCallout>
      <EuiSpacer size="m" />
    </>
  );
};
