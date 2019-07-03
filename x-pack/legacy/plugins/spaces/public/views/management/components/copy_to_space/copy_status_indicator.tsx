/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ProcessedImportResponse } from 'ui/management/saved_objects_management';
import { EuiLoadingSpinner, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { summarizeCopyResult } from '../../../../lib/copy_to_space';

interface Props {
  copyResult: ProcessedImportResponse | undefined;
}

export const CopyStatusIndicator = (props: Props) => {
  const { copyResult } = props;
  if (!copyResult) {
    return (
      <span>
        <EuiLoadingSpinner />{' '}
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.inProgressText"
          defaultMessage="processing..."
        />
      </span>
    );
  }

  const { successful, hasConflicts, hasUnresolvableErrors } = summarizeCopyResult(copyResult);

  if (successful) {
    return (
      <span>
        <EuiIcon type={'check'} color={'success'} />{' '}
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.copySuccessful"
          defaultMessage="finished!"
        />
      </span>
    );
  }
  if (hasUnresolvableErrors) {
    return (
      <span>
        <EuiIcon type={'cross'} color={'danger'} />{' '}
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.copyUnsuccessful"
          defaultMessage="error"
        />
      </span>
    );
  }
  if (hasConflicts) {
    return (
      <span>
        <EuiIcon type={'alert'} color={'warning'} />{' '}
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.hasConflicts"
          defaultMessage="conflicts detected"
        />
      </span>
    );
  }
  return null;
};
