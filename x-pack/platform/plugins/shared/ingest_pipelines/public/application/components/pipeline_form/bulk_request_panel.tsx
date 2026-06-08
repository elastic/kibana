/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiSpacer,
  EuiPanel,
  EuiCodeBlock,
  EuiText,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

const bulkRequestExample = `PUT books/_bulk?pipeline=my-pipeline
{ "create":{ } }
{ "name": "Snow Crash", "author": "Neal Stephenson" }
{ "create":{ } }
{ "name": "Revelation Space", "author": "Alastair Reynolds" }
`;

const singleRequestExample = `POST books/_doc?pipeline=my-pipeline-name
{
  "name": "Snow Crash",
  "author": "Neal Stephenson"
}
`;

export const BulkRequestPanel = () => {
  const [showBulkToggle, setShowBulkToggle] = useState(true);

  return (
    <EuiPanel hasShadow={false} hasBorder grow={false}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.ingestPipelines.form.bulkCardTitle"
                defaultMessage="Bulk request this pipeline during data ingestion"
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            showLabel={false}
            label={i18n.translate('xpack.ingestPipelines.form.bulkRequestToggle', {
              defaultMessage: 'Bulk request this pipeline during data ingestion',
            })}
            checked={showBulkToggle}
            onChange={(e: EuiSwitchEvent) => setShowBulkToggle(e.target.checked)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiCodeBlock language="json" overflowHeight={250} isCopyable>
        {showBulkToggle ? bulkRequestExample : singleRequestExample}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
