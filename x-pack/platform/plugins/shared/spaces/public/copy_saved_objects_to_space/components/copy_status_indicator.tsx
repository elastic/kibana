/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiLoadingSpinner } from '@elastic/eui';
import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { SummarizedCopyToSpaceResult, SummarizedSavedObjectResult } from '../lib';
import type { ImportRetry } from '../types';

interface Props {
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  object: { type: string; id: string };
  pendingObjectRetry?: ImportRetry;
  conflictResolutionInProgress: boolean;
}

export const CopyStatusIndicator = (props: Props) => {
  const { summarizedCopyResult, conflictResolutionInProgress, pendingObjectRetry } = props;
  if (summarizedCopyResult.processing || conflictResolutionInProgress) {
    return <EuiLoadingSpinner />;
  }

  const objectResult = summarizedCopyResult.objects.find(
    (o) => o.type === props.object!.type && o.id === props.object!.id
  ) as SummarizedSavedObjectResult;
  const { conflict, hasMissingReferences, hasUnresolvableErrors, overwrite } = objectResult;
  const hasConflicts = conflict && !pendingObjectRetry?.overwrite;
  const successful = !hasMissingReferences && !hasUnresolvableErrors && !hasConflicts;

  if (successful && !pendingObjectRetry) {
    // there is no retry pending, so this object was actually copied
    const message = overwrite ? (
      // the object was overwritten
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.successAutomaticOverwriteMessage"
        defaultMessage="Object was overwritten."
      />
    ) : (
      // the object was not overwritten
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.successMessage"
        defaultMessage="Object was copied."
      />
    );
    return <EuiIconTip type={'checkInCircleFilled'} color={'success'} content={message} />;
  }

  if (successful && pendingObjectRetry) {
    const message = overwrite ? (
      // this is an "automatic overwrite", e.g., the "Overwrite all conflicts" option was selected
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.pendingAutomaticOverwriteMessage"
        defaultMessage="Object will be overwritten."
      />
    ) : pendingObjectRetry?.overwrite ? (
      // this is a manual overwrite, e.g., the individual "Overwrite?" switch was enabled
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.pendingOverwriteMessage"
        defaultMessage="Object will be overwritten. Disable 'Overwrite' to skip."
      />
    ) : (
      // this object is pending success, but it will not result in an overwrite
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.pendingMessage"
        defaultMessage="Object will be copied."
      />
    );
    return <EuiIconTip type={'check'} color={'warning'} content={message} />;
  }

  if (hasUnresolvableErrors) {
    return (
      <EuiIconTip
        type={'alert'}
        color={'danger'}
        data-test-subj={`cts-object-result-error-${objectResult.id}`}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.unresolvableErrorMessage"
            defaultMessage="An error occurred copying this object."
          />
        }
      />
    );
  }

  if (hasConflicts) {
    switch (conflict!.error.type) {
      case 'conflict':
        return (
          <EuiIconTip
            type={'alert'}
            color={'warning'}
            content={
              <Fragment>
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpace.copyStatus.conflictMessage"
                  defaultMessage="This conflicts with an existing object. Enable ‘Overwrite’ to replace it."
                />
              </Fragment>
            }
          />
        );
      case 'ambiguous_conflict':
        return (
          <EuiIconTip
            type={'alert'}
            color={'warning'}
            content={
              <Fragment>
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpace.copyStatus.ambiguousConflictMessage"
                  defaultMessage="This conflicts with multiple existing objects. Enable ‘Overwrite’ to replace one."
                />
              </Fragment>
            }
          />
        );
    }
  }

  return hasMissingReferences ? (
    <EuiIconTip
      type={'link'}
      color={'warning'}
      data-test-subj={`cts-object-result-missing-references-${objectResult.id}`}
      content={
        overwrite ? (
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.missingReferencesAutomaticOverwriteMessage"
            defaultMessage="Object will be overwritten, but one or more references are missing."
          />
        ) : conflict ? (
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.missingReferencesOverwriteMessage"
            defaultMessage="Object will be overwritten, but one or more references are missing. Disable 'Overwrite' to skip."
          />
        ) : (
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.missingReferencesMessage"
            defaultMessage="Object will be copied, but one or more references are missing."
          />
        )
      }
    />
  ) : null;
};
