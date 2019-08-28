/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiHorizontalRule,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFormLabel,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { timeDurationString } from '../../../lib/time_duration';
import { RefreshControl } from '../refresh_control';
import { CustomInterval } from './custom_interval';

const ListGroup = ({ children }) => <ul style={{ listStyle: 'none', margin: 0 }}>{[children]}</ul>;

export const AutoRefreshControls = ({ refreshInterval, setRefresh, disableInterval }) => {
  const RefreshItem = ({ duration, label }) => (
    <li>
      <EuiLink onClick={() => setRefresh(duration)}>{label}</EuiLink>
    </li>
  );

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="xs">
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>Refresh elements</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {refreshInterval > 0 ? (
                  <Fragment>
                    <span>Every {timeDurationString(refreshInterval)}</span>
                  </Fragment>
                ) : (
                  <span>Manually</span>
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
              {refreshInterval > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip position="bottom" content="Disable auto-refresh">
                    <EuiButtonIcon
                      iconType="cross"
                      onClick={disableInterval}
                      aria-label="Disable auto-refresh"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <RefreshControl />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <EuiFormLabel>Change auto-refresh interval</EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration="5000" label="5 seconds" />
                <RefreshItem duration="15000" label="15 seconds" />
                <RefreshItem duration="30000" label="30 seconds" />
                <RefreshItem duration="60000" label="1 minute" />
                <RefreshItem duration="300000" label="5 minutes" />
                <RefreshItem duration="900000" label="15 minute" />
              </ListGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration="1800000" label="30 Minutes" />
                <RefreshItem duration="3600000" label="1 Hour" />
                <RefreshItem duration="7200000" label="2 Hours" />
                <RefreshItem duration="21600000" label="6 Hours" />
                <RefreshItem duration="43200000" label="12 Hours" />
                <RefreshItem duration="86400000" label="24 Hours" />
              </ListGroup>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <CustomInterval onSubmit={value => setRefresh(value)} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AutoRefreshControls.propTypes = {
  refreshInterval: PropTypes.number,
  setRefresh: PropTypes.func.isRequired,
  disableInterval: PropTypes.func.isRequired,
};
