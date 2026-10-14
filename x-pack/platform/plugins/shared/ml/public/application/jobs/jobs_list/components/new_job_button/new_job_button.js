/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { useCreateAndNavigateToManagementMlLink } from '../../../../contexts/kibana/use_create_url';

export function NewJobButton({ size = 's' }) {
  const canCreateJob = usePermissionCheck('canCreateJob');
  const buttonEnabled = canCreateJob && mlNodesAvailable();
  const redirectToCreateJobSelectIndexPage = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    'anomaly_detection'
  );

  return (
    <EuiButton
      data-test-subj="mlCreateNewJobButton"
      onClick={redirectToCreateJobSelectIndexPage}
      size={size}
      disabled={buttonEnabled === false}
      fill
      iconType="plusCircle"
    >
      <FormattedMessage
        id="xpack.ml.jobsList.createNewJobButtonLabel"
        defaultMessage="Create job"
      />
    </EuiButton>
  );
}
