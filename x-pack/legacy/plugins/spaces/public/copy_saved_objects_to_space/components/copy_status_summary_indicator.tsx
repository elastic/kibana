/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Space } from '../../../common/model/space';
import { SummarizedCopyToSpaceResult } from '..';

interface Props {
  space: Space;
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  conflictResolutionInProgress: boolean;
}

export const CopyStatusSummaryIndicator = (props: Props) => {
  const { summarizedCopyResult } = props;
  const getDataTestSubj = (status: string) => `cts-summary-indicator-${status}-${props.space.id}`;

  if (summarizedCopyResult.processing || props.conflictResolutionInProgress) {
    return <EuiLoadingSpinner data-test-subj={getDataTestSubj('loading')} />;
  }

  if (summarizedCopyResult.successful) {
    return (
      <EuiIconTip
        type={'check'}
        color={'success'}
        iconProps={{
          'data-test-subj': getDataTestSubj('success'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.successMessage"
            defaultMessage="Copied successfully to the {space} space."
            values={{ space: props.space.name }}
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
        iconProps={{
          'data-test-subj': getDataTestSubj('failed'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.failedMessage"
            defaultMessage="Copy to the {space} space failed. Expand this section for details."
            values={{ space: props.space.name }}
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
        iconProps={{
          'data-test-subj': getDataTestSubj('conflicts'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.conflictsMessage"
            defaultMessage="One or more conflicts detected in the {space} space. Expand this section to resolve."
            values={{ space: props.space.name }}
          />
        }
      />
    );
  }
  return null;
};
