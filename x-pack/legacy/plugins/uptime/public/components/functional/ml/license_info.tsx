/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext } from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { UptimeSettingsContext } from '../../../contexts';

export const ShowLicenseInfo = () => {
  const { basePath } = useContext(UptimeSettingsContext);
  return (
    <>
      <EuiCallOut title="Start free 14-day Platinum license trial" color="primary" iconType="help">
        <p>
          In order to access duration anomaly detection, you have to be subscribed to an Elastic
          Platinum license.
        </p>
        <EuiButton
          color="primary"
          href={basePath + `/app/kibana#/management/elasticsearch/license_management/home`}
        >
          Start free 14-day trial
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
