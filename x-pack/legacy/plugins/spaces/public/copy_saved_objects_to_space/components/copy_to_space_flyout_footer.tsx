/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiStat, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ProcessedImportResponse } from '../../../../../../../src/legacy/core_plugins/management/public';
import { ImportRetry } from '../types';

interface Props {
  copyInProgress: boolean;
  conflictResolutionInProgress: boolean;
  initialCopyFinished: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, ImportRetry[]>;
  numberOfSelectedSpaces: number;
  onCopyStart: () => void;
  onCopyFinish: () => void;
}
export const CopyToSpaceFlyoutFooter = (props: Props) => {
  const { copyInProgress, initialCopyFinished, copyResult, retries } = props;

  let summarizedResults = {
    successCount: 0,
    overwriteConflictCount: 0,
    conflictCount: 0,
    unresolvableErrorCount: 0,
  };
  if (copyResult) {
    summarizedResults = Object.entries(copyResult).reduce((acc, result) => {
      const [spaceId, spaceResult] = result;
      const overwriteCount = (retries[spaceId] || []).filter(c => c.overwrite).length;
      return {
        loading: false,
        successCount: acc.successCount + spaceResult.importCount,
        overwriteConflictCount: acc.overwriteConflictCount + overwriteCount,
        conflictCount:
          acc.conflictCount +
          spaceResult.failedImports.filter(i => i.error.type === 'conflict').length -
          overwriteCount,
        unresolvableErrorCount:
          acc.unresolvableErrorCount +
          spaceResult.failedImports.filter(i => i.error.type !== 'conflict').length,
      };
    }, summarizedResults);
  }

  const getButton = () => {
    let actionButton;
    if (initialCopyFinished) {
      const hasPendingOverwrites = summarizedResults.overwriteConflictCount > 0;

      const buttonText = hasPendingOverwrites ? (
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.finishPendingOverwritesCopyToSpacesButton"
          defaultMessage="Overwrite {overwriteCount} objects"
          values={{ overwriteCount: summarizedResults.overwriteConflictCount }}
        />
      ) : (
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.finishCopyToSpacesButton"
          defaultMessage="Finish"
        />
      );
      actionButton = (
        <EuiButton
          fill
          isLoading={props.conflictResolutionInProgress}
          aria-live="assertive"
          aria-label={
            props.conflictResolutionInProgress
              ? i18n.translate('xpack.spaces.management.copyToSpace.inProgressButtonLabel', {
                  defaultMessage: 'Copy is in progress. Please wait.',
                })
              : i18n.translate('xpack.spaces.management.copyToSpace.finishedButtonLabel', {
                  defaultMessage: 'Copy finished.',
                })
          }
          onClick={() => props.onCopyFinish()}
          data-test-subj="cts-finish-button"
        >
          {buttonText}
        </EuiButton>
      );
    } else {
      actionButton = (
        <EuiButton
          fill
          isLoading={copyInProgress}
          onClick={() => props.onCopyStart()}
          data-test-subj="cts-initiate-button"
          disabled={props.numberOfSelectedSpaces === 0 || copyInProgress}
        >
          {props.numberOfSelectedSpaces > 0 ? (
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.copyToSpacesButton"
              defaultMessage="Copy to {spaceCount} {spaceCount, plural, one {space} other {spaces}}"
              values={{ spaceCount: props.numberOfSelectedSpaces }}
            />
          ) : (
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.disabledCopyToSpacesButton"
              defaultMessage="Copy"
            />
          )}
        </EuiButton>
      );
    }

    return (
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>{actionButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  if (!copyInProgress) {
    return getButton();
  }

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-success-count`}
            title={summarizedResults.successCount}
            titleSize="s"
            titleColor={initialCopyFinished ? 'secondary' : 'subdued'}
            isLoading={!initialCopyFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpaceFlyoutFooter.successCount"
                defaultMessage="Copied"
              />
            }
          />
        </EuiFlexItem>
        {summarizedResults.overwriteConflictCount > 0 && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj={`cts-summary-overwrite-count`}
              title={summarizedResults.overwriteConflictCount}
              titleSize="s"
              titleColor={summarizedResults.overwriteConflictCount > 0 ? 'primary' : 'subdued'}
              isLoading={!initialCopyFinished}
              textAlign="center"
              description={
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpaceFlyoutFooter.pendingCount"
                  defaultMessage="Pending"
                />
              }
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-conflict-count`}
            title={summarizedResults.conflictCount}
            titleSize="s"
            titleColor={summarizedResults.conflictCount > 0 ? 'primary' : 'subdued'}
            isLoading={!initialCopyFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpaceFlyoutFooter.conflictCount"
                defaultMessage="Skipped"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-error-count`}
            title={summarizedResults.unresolvableErrorCount}
            titleSize="s"
            titleColor={summarizedResults.unresolvableErrorCount > 0 ? 'danger' : 'subdued'}
            isLoading={!initialCopyFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpaceFlyoutFooter.errorCount"
                defaultMessage="Errors"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      {getButton()}
    </Fragment>
  );
};
