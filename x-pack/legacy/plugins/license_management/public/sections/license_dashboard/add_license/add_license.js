/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { BASE_PATH } from '../../../../common/constants';

import { EuiCard, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const AddLicense = ({ uploadPath = `#${BASE_PATH}upload_license` }) => {
  return (
    <EuiCard
      title={
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.addLicense.updateLicenseTitle"
          defaultMessage="Update your license"
        />
      }
      description={
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.addLicense.useAvailableLicenseDescription"
          defaultMessage="If you already have a new license, upload it now."
        />
      }
      footer={
        <EuiButton data-test-subj="updateLicenseButton" href={uploadPath}>
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.addLicense.updateLicenseButtonLabel"
            defaultMessage="Update license"
          />
        </EuiButton>
      }
    />
  );
};
