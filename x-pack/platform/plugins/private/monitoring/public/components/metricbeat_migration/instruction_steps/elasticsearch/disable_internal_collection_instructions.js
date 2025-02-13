/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCodeBlock, EuiText } from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDisableStatusStep } from '../common_instructions';

export function getElasticsearchInstructionsForDisablingInternalCollection(product, meta) {
  const disableInternalCollectionStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.elasticsearchInstructions.disableInternalCollectionTitle',
      {
        defaultMessage: 'Disable self monitoring of Elasticsearch monitoring metrics',
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.disableInternalCollectionDescription"
              defaultMessage="Disable self monitoring of Elasticsearch monitoring metrics.
            Set {monospace} to false on each server in the production cluster."
              values={{
                monospace: <Monospace>xpack.monitoring.elasticsearch.collection.enabled</Monospace>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock isCopyable language="curl">
          {`PUT _cluster/settings
{
  "persistent": {
    "xpack.monitoring.elasticsearch.collection.enabled": false
  }
}
          `}
        </EuiCodeBlock>
      </Fragment>
    ),
  };

  const migrationStatusStep = getDisableStatusStep(product, meta);

  return [disableInternalCollectionStep, migrationStatusStep];
}
