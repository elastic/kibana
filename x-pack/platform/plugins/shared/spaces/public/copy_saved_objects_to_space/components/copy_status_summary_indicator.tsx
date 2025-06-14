/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiIconTip, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { ResolveAllConflicts } from './resolve_all_conflicts';
import type { SpacesDataEntry } from '../../types';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';

interface Props {
  space: SpacesDataEntry;
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  conflictResolutionInProgress: boolean;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  onDestinationMapChange: (value?: Map<string, string>) => void;
}

const CopyStatusIcon = (props: Props) => {
  const { euiTheme } = useEuiTheme();
  const {
    space,
    summarizedCopyResult,
    conflictResolutionInProgress,
    retries,
    onRetriesChange,
    onDestinationMapChange,
  } = props;
  const getDataTestSubj = (status: string) => `cts-summary-indicator-${status}-${space.id}`;

  if (summarizedCopyResult.processing || conflictResolutionInProgress) {
    return <EuiLoadingSpinner data-test-subj={getDataTestSubj('loading')} />;
  }

  const { successful, hasUnresolvableErrors, hasMissingReferences, hasConflicts } =
    summarizedCopyResult;

  if (successful) {
    return (
      <EuiIconTip
        type={'checkInCircleFilled'}
        color={'success'}
        iconProps={{
          'data-test-subj': getDataTestSubj('success'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.successMessage"
            defaultMessage="Copy to the {space} space was successful."
            values={{ space: space.name }}
          />
        }
      />
    );
  }

  if (hasUnresolvableErrors) {
    return (
      <EuiIconTip
        type={'alert'}
        color={'danger'}
        iconProps={{
          'data-test-subj': getDataTestSubj('failed'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.failedMessage"
            defaultMessage="Copy to the {space} space failed. Expand this section for details."
            values={{ space: space.name }}
          />
        }
      />
    );
  }

  const missingReferences = hasMissingReferences ? (
    <span
      css={css`
        margin-left: ${euiTheme.size.xs};
      `}
    >
      <EuiIconTip
        type={'link'}
        color={'warning'}
        iconProps={{
          'data-test-subj': getDataTestSubj('missingReferences'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.missingReferencesMessage"
            defaultMessage="Missing references detected in the {space} space. Expand this section for details."
            values={{ space: space.name }}
          />
        }
      />
    </span>
  ) : null;

  if (hasConflicts) {
    return (
      <Fragment>
        <ResolveAllConflicts
          summarizedCopyResult={summarizedCopyResult}
          retries={retries}
          onRetriesChange={onRetriesChange}
          onDestinationMapChange={onDestinationMapChange}
        />
        <EuiIconTip
          type={'alert'}
          color={'warning'}
          iconProps={{
            'data-test-subj': getDataTestSubj('conflicts'),
          }}
          content={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.copyStatusSummary.conflictsMessage"
              defaultMessage="Conflicts detected in the {space} space. Expand this section to resolve."
              values={{ space: space.name }}
            />
          }
        />
        {missingReferences}
      </Fragment>
    );
  }

  return missingReferences;
};

export const CopyStatusSummaryIndicator = (props: Props) => {
  const { summarizedCopyResult } = props;
  const { euiTheme } = useEuiTheme();
  return (
    <Fragment>
      <CopyStatusIcon {...props} />
      <EuiBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
      >
        {summarizedCopyResult.objects.length}
      </EuiBadge>
    </Fragment>
  );
};
