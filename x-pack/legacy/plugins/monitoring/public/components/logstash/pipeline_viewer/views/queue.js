/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatementListHeading } from './statement_list_heading';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function Queue() {
  return (
    <div>
      <StatementListHeading iconType="logstashQueue" title="Queue" />
      <EuiSpacer size="s" />
      <EuiText className="monPipelineViewer__queueMessage">
        <FormattedMessage
          id="xpack.monitoring.logstash.pipeline.queue.noMetricsDescription"
          defaultMessage="Queue metrics not available"
        />
      </EuiText>
    </div>
  );
}
