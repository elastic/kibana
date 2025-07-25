/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface MorePipelinesLabelProps {
  count: number;
}

export const MorePipelinesLabel = ({ count }: MorePipelinesLabelProps) => {
  return (
    <EuiLink color="primary" onClick={() => {}} data-test-subj="morePipelinesNodeLabel">
      <FormattedMessage
        id="ingestPipelines.pipelineStructureTree.morePipelinesTreeNodeLabel"
        defaultMessage="+{count} more {count, plural,one {pipeline} other {pipelines}}"
        values={{ count }}
      />
    </EuiLink>
  );
};
