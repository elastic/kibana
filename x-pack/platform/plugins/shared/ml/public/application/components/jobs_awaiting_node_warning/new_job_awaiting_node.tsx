/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JobType } from '@kbn/ml-common-types/saved_objects';
import { lazyMlNodesAvailable } from '../../ml_nodes_check';
import { useEnabledFeatures } from '../../contexts/ml';

interface Props {
  jobType: JobType;
}

export const NewJobAwaitingNodeWarning: FC<Props> = () => {
  const { showNodeInfo } = useEnabledFeatures();
  if (lazyMlNodesAvailable() === false) {
    return null;
  }

  return showNodeInfo ? (
    <>
      <KbnInfoCallout
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarning.title"
            defaultMessage="Awaiting machine learning node"
          />
        }
        text={
          <FormattedMessage
            id="xpack.ml.newJobAwaitingNodeWarning.noMLNodesAvailableDescription"
            defaultMessage="There are currently no nodes that can run the job, therefore it will remain in OPENING state until autoscaling increases ML capacity. This may take several minutes."
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  ) : (
    <>
      <KbnInfoCallout
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarning.serverless.title"
            defaultMessage="Machine learning is starting..."
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
