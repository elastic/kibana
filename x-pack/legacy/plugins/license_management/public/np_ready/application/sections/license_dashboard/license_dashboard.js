/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { LicenseStatus } from './license_status';
import { RevertToBasic } from './revert_to_basic';
import { StartTrial } from './start_trial';
import { AddLicense } from './add_license';
import { RequestTrialExtension } from './request_trial_extension';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiCard, EuiButton } from '@elastic/eui';
import { HOURLY_COST } from '../../../../../common/constants';

export const LicenseDashboard = ({ setBreadcrumb } = { setBreadcrumb: () => {} }) => {
  const hourlyCost = localStorage.getItem(HOURLY_COST);
  useEffect(() => {
    setBreadcrumb('dashboard');
  });

  return (
    <div>
      <LicenseStatus />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem>
          <AddLicense />
        </EuiFlexItem>
        <StartTrial />
        <RequestTrialExtension />
        <RevertToBasic />
      </EuiFlexGroup>
      {hourlyCost ? (
        <Fragment>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem>
              <EuiCard
                title="Have you considered Elastic Cloud?"
                description={`Based on your current cluster's size, it will only cost you $${Number(
                  hourlyCost * 30 * 24
                ).toPrecision(
                  4
                )}/month. With Elastic Cloud you'll also benefit from Elastic Support, blah, blah, ...`}
                footer={
                  <EuiButton
                    data-test-subj="updateLicenseButton"
                    href="https://cloud.elastic.co/"
                    target="_blank"
                  >
                    I want to know more
                  </EuiButton>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      ) : null}
    </div>
  );
};
