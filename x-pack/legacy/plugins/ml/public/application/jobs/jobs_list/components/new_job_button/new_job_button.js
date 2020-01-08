/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPermission } from '../../../../privilege/check_privilege';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

function newJob() {
  window.location.href = `#/jobs/new_job`;
}

export function NewJobButton() {
  const buttonEnabled = checkPermission('canCreateJob') && mlNodesAvailable();
  return (
    <EuiButton
      data-test-subj="mlCreateNewJobButton"
      onClick={newJob}
      size="s"
      disabled={buttonEnabled === false}
      fill
      iconType="plusInCircle"
    >
      <FormattedMessage
        id="xpack.ml.jobsList.createNewJobButtonLabel"
        defaultMessage="Create new job"
      />
    </EuiButton>
  );
}
