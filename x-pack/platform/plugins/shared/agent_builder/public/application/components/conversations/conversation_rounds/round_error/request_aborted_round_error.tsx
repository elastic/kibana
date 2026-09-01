/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const RequestAbortedRoundError: React.FC = () => {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="agentBuilderRoundErrorRequestAborted"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.round.error.requestAborted.description"
              defaultMessage="The request was interrupted before the model could complete its response. This typically happens when a tool returns a very large amount of data, such as index mappings with many fields. Try narrowing your question or using a more specific index pattern."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
