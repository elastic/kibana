/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiHorizontalRule,
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText,
  EuiTextColor,
  EuiButtonEmpty,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toggleSetupMode } from '../../lib/setup_mode';
import { CheckingSettings } from './checking_settings';
import { ReasonFound, WeTried } from './reasons';
import { CheckerErrors } from './checker_errors';
import { CloudDeployment } from './blurbs';
import { getSafeForExternalLink } from '../../lib/get_safe_for_external_link';

function NoDataMessage(props) {
  const { isLoading, reason, checkMessage, isCollectionEnabledUpdated } = props;

  if ((isCollectionEnabledUpdated && !reason) || isLoading) {
    return <CheckingSettings checkMessage={checkMessage} />;
  }

  if (reason) {
    return <ReasonFound {...props} />;
  }

  return <WeTried />;
}

export function NoData(props) {
  const [isLoading, setIsLoading] = useState(false);
  const [useInternalCollection, setUseInternalCollection] = useState(false);
  const isCloudEnabled = props.isCloudEnabled;

  async function startSetup() {
    setIsLoading(true);
    await toggleSetupMode(true);
    window.location.hash = getSafeForExternalLink('#/elasticsearch/nodes');
  }

  const NoDataContainer = ({ children }) => {
    return <EuiPage data-test-subj="noDataContainer">{children}</EuiPage>;
  };

  if (isCloudEnabled) {
    return (
      <NoDataContainer>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.noData.cloud.heading"
              defaultMessage="No monitoring data found."
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPageBody restrictWidth={600}>
          <EuiPageTemplate.EmptyPrompt
            icon={<EuiIcon type="monitoringApp" size="xxl" />}
            title={
              <h2>
                <FormattedMessage
                  id="xpack.monitoring.noData.cloud.title"
                  defaultMessage="Monitoring data not available"
                />
              </h2>
            }
            body={
              <>
                <EuiTextColor color="subdued">
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.monitoring.noData.cloud.description"
                        defaultMessage="Monitoring provides insight to your hardware performance and load."
                      />
                    </p>
                  </EuiText>
                </EuiTextColor>
                <EuiHorizontalRule size="half" />
                <CloudDeployment />
              </>
            }
          />
        </EuiPageBody>
      </NoDataContainer>
    );
  }

  if (useInternalCollection) {
    return (
      <NoDataContainer>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.no_data.internal_collection.heading"
              defaultMessage="No monitoring data found."
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPageBody restrictWidth={600}>
          <EuiPageTemplate.EmptyPrompt
            icon={<EuiIcon type="monitoringApp" size="xxl" />}
            body={
              <>
                <NoDataMessage {...props} />
                <CheckerErrors errors={props.errors} />
              </>
            }
            actions={
              !props.isCloudEnabled ? (
                <>
                  <EuiHorizontalRule size="half" />
                  <EuiButtonEmpty
                    isDisabled={props.isCollectionEnabledUpdated}
                    onClick={() => setUseInternalCollection(false)}
                  >
                    <EuiTextColor color="default">
                      <FormattedMessage
                        id="xpack.monitoring.noData.setupMetricbeatInstead"
                        defaultMessage="Or, set up with Metricbeat (recommended)"
                      />
                    </EuiTextColor>
                  </EuiButtonEmpty>
                </>
              ) : null
            }
          />
        </EuiPageBody>
      </NoDataContainer>
    );
  }

  return (
    <NoDataContainer>
      <EuiScreenReaderOnly>
        <h1>
          <FormattedMessage
            id="xpack.monitoring.no_data.heading"
            defaultMessage="No monitoring data found."
          />
        </h1>
      </EuiScreenReaderOnly>
      <EuiPageBody restrictWidth={600}>
        <EuiPageTemplate.EmptyPrompt
          icon={<EuiIcon type="monitoringApp" size="xxl" />}
          title={
            <h2>
              <FormattedMessage
                id="xpack.monitoring.noData.noMonitoringDetected"
                defaultMessage="No monitoring data found"
              />
            </h2>
          }
          body={
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.monitoring.noData.noMonitoringDataFound"
                  defaultMessage="Have you set up monitoring yet? If so, make sure that the selected time period in
                the upper right includes monitoring data."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.monitoring.noData.remoteCollectionNotice"
                  defaultMessage="If you have configured monitoring data to be sent to a dedicated monitoring
                cluster you should access that data with the Kibana instance attached to the monitoring cluster."
                />
              </p>
            </EuiText>
          }
          actions={
            <>
              <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill={true}
                    onClick={startSetup}
                    type="button"
                    data-test-subj="enableCollectionInterval"
                    isLoading={isLoading}
                  >
                    <FormattedMessage
                      id="xpack.monitoring.noData.collectionInterval.turnOnMonitoringButtonLabel"
                      defaultMessage="Set up monitoring with Metricbeat"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule size="half" />
              <EuiButtonEmpty
                onClick={() => setUseInternalCollection(true)}
                data-test-subj="useInternalCollection"
              >
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.monitoring.noData.setupInternalInstead"
                    defaultMessage="Or, set up with self monitoring"
                  />
                </EuiTextColor>
              </EuiButtonEmpty>
            </>
          }
        />
      </EuiPageBody>
    </NoDataContainer>
  );
}

NoData.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  reason: PropTypes.object,
  checkMessage: PropTypes.string,
};
