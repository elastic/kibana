/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiIcon } from '@elastic/eui';
import {
  SummarizedCopyToSpaceResponse,
  SummarizedSavedObjectResult,
} from '../../../../lib/copy_to_space';

interface Props {
  summarizedCopyResult: SummarizedCopyToSpaceResponse | undefined;
  object?: { type: string; id: string };
  overwritePending?: boolean;
}

export const CopyStatusIndicator = (props: Props) => {
  const { summarizedCopyResult } = props;
  if (!summarizedCopyResult) {
    return <EuiLoadingSpinner />;
  }

  let successful = false;
  let successColor = 'success';
  let hasConflicts = false;
  let hasUnresolvableErrors = false;

  if (props.object) {
    const objectResult = summarizedCopyResult.objects.find(
      o => o.type === props.object!.type && o.id === props.object!.id
    ) as SummarizedSavedObjectResult;

    successful =
      !objectResult.hasUnresolvableErrors &&
      (objectResult.conflicts.length === 0 || props.overwritePending === true);
    successColor = props.overwritePending ? 'warning' : 'success';
    hasConflicts = objectResult.conflicts.length > 0;
    hasUnresolvableErrors = objectResult.hasUnresolvableErrors;
  } else {
    successful = summarizedCopyResult.successful;
    hasConflicts = summarizedCopyResult.hasConflicts;
    hasUnresolvableErrors = summarizedCopyResult.hasUnresolvableErrors;
  }

  if (successful) {
    return <EuiIcon type={'check'} color={successColor} />;
  }
  if (hasUnresolvableErrors) {
    return <EuiIcon type={'cross'} color={'danger'} />;
  }
  if (hasConflicts) {
    return <EuiIcon type={'alert'} color={'warning'} />;
  }
  return null;
};
