/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext } from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { UptimeSettingsContext } from '../../../contexts';
import * as labels from './translations';

export const ShowLicenseInfo = () => {
  const { basePath } = useContext(UptimeSettingsContext);
  return (
    <>
      <EuiCallOut
        data-test-subj="uptimeMLLicenseInfo"
        className="license-info-trial"
        title={labels.START_TRAIL}
        color="primary"
        iconType="help"
      >
        <p>{labels.START_TRAIL_DESC}</p>
        <EuiButton
          color="primary"
          href={basePath + `/app/kibana#/management/elasticsearch/license_management/home`}
          target="_blank"
        >
          {labels.START_TRAIL}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
