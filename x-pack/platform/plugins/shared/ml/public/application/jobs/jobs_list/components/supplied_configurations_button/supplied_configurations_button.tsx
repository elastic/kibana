/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCreateAndNavigateToManagementMlLink } from '../../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../locator';

export const SuppliedConfigurationsButton = () => {
  const redirectToSuppliedConfigurationsPage = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.SUPPLIED_CONFIGURATIONS,
    'anomaly_detection'
  );

  return (
    <EuiButtonEmpty
      size="m"
      iconType="listAdd"
      onClick={redirectToSuppliedConfigurationsPage}
      flush="left"
      data-test-subj="mlSuppliedConfigurationsButton"
    >
      <FormattedMessage
        id="xpack.ml.suppliedConfigurationsManagementLabel"
        defaultMessage="Supplied configurations"
      />
    </EuiButtonEmpty>
  );
};

export const AnomalyDetectionSettingsButton = () => {
  const redirectToAnomalyDetectionSettingsPage = useCreateAndNavigateToManagementMlLink(
    '',
    'ad_settings'
  );

  return (
    <EuiButtonEmpty
      size="m"
      iconType="gear"
      onClick={redirectToAnomalyDetectionSettingsPage}
      flush="left"
      data-test-subj="mlAnomalyDetectionSettingsButton"
    >
      <FormattedMessage id="xpack.ml.anomalyDetectionSettingsLabel" defaultMessage="Settings" />
    </EuiButtonEmpty>
  );
};
