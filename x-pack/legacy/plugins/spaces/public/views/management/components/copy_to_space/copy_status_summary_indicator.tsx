/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SummarizedCopyToSpaceResponse } from '../../../../lib/copy_to_space';

interface Props {
  summarizedCopyResult: SummarizedCopyToSpaceResponse;
  conflictResolutionInProgress: boolean;
}

export const CopyStatusSummaryIndicator = (props: Props) => {
  const { summarizedCopyResult } = props;
  if (summarizedCopyResult.processing || props.conflictResolutionInProgress) {
    return <EuiLoadingSpinner />;
  }

  if (summarizedCopyResult.successful) {
    return (
      <EuiIconTip
        type={'check'}
        color={'success'}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.successMessage"
            defaultMessage="Copied successfully"
          />
        }
      />
    );
  }
  if (summarizedCopyResult.hasUnresolvableErrors) {
    return (
      <EuiIconTip
        type={'cross'}
        color={'danger'}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.failedMessage"
            defaultMessage="Copy failed. Expand this section for details."
          />
        }
      />
    );
  }
  if (summarizedCopyResult.hasConflicts) {
    return (
      <EuiIconTip
        type={'alert'}
        color={'warning'}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.conflictsMessage"
            defaultMessage="One or more conflicts detected. Exand this section to resolve."
          />
        }
      />
    );
  }
  return null;
};
