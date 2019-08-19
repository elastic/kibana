/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiSpacer,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText
} from '@elastic/eui';
import { WhatIs } from './blurbs';
import { FormattedMessage } from '@kbn/i18n/react';
import { toggleSetupMode } from '../../lib/setup_mode';

// function NoDataMessage(props) {
//   const { isLoading, reason, checkMessage } = props;

//   if (isLoading && checkMessage !== null) {
//     return <CheckingSettings checkMessage={checkMessage} />;
//   }

//   if (reason) {
//     return <ReasonFound {...props} />;
//   }

//   return <WeTried />;
// }

export function NoData({ changePath }) {
  const [isLoading, setIsLoading] = useState(false);
  async function startSetup() {
    setIsLoading(true);
    await toggleSetupMode(true);
    changePath('/elasticsearch/nodes');
  }

  return (
    <EuiPage>
      <EuiPageBody restrictWidth={600}>
        <EuiPageContent
          verticalPosition="center"
          horizontalPosition="center"
          className="eui-textCenter"
        >
          <EuiIcon type="monitoringApp" size="xxl" />
          <EuiSpacer size="m" />
          <WhatIs />
          <EuiHorizontalRule size="half" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.monitoring.noData.noMonitoringDataFound"
                defaultMessage="We did not find any monitoring data in the currently selected time period."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.monitoring.noData.noMonitoringDataFound2"
                defaultMessage="Either adjust your time period or click the button below to setup monitoring."
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceAround"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={true}
                onClick={startSetup}
                type="button"
                data-test-subj="enableCollectionInterval"
                isLoading={isLoading}
              >
                <FormattedMessage
                  id="xpack.monitoring.noData.explanations.collectionInterval.turnOnMonitoringButtonLabel"
                  defaultMessage="Start monitoring setup"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

NoData.propTypes = {
  changePath: PropTypes.func.isRequired,
};
