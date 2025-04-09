/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';

import React, { useCallback } from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ML_PAGES } from '../../../../../../common/constants/locator';
import { useMlManagementLocator } from '../../../../contexts/kibana';

export function NewJobButton({ size = 's' }) {
  const canCreateJob = usePermissionCheck('canCreateJob');
  const buttonEnabled = canCreateJob && mlNodesAvailable();
  const mlLocator = useMlManagementLocator();

  const redirectToCreateJobSelectIndexPage = useCallback(async () => {
    if (!mlLocator || !canCreateJob) return;

    await mlLocator.navigate({
      sectionId: 'ml',
      appId: `anomaly_detection/${ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX}`,
    });
  }, [mlLocator, canCreateJob]);

  return (
    <EuiButton
      data-test-subj="mlCreateNewJobButton"
      onClick={redirectToCreateJobSelectIndexPage}
      size={size}
      disabled={buttonEnabled === false}
      fill
      iconType="plusInCircle"
    >
      <FormattedMessage
        id="xpack.ml.jobsList.createNewJobButtonLabel"
        defaultMessage="Create job"
      />
    </EuiButton>
  );
}
