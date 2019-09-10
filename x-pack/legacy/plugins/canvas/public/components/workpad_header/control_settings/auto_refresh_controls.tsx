/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ReactNode } from 'react';
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
import { timeDuration } from '../../../lib/time_duration';
import { RefreshControl } from '../refresh_control';
import { CustomInterval } from './custom_interval';

import { ComponentStrings, UnitStrings } from '../../../../i18n';
const { WorkpadHeaderAutoRefreshControls: strings } = ComponentStrings;
const { time: timeStrings } = UnitStrings;

interface Props {
  refreshInterval: number;
  setRefresh: (interval: number) => void;
  disableInterval: () => void;
}

interface ListGroupProps {
  children: ReactNode;
}

interface RefreshItemProps {
  duration: number;
  label: string;
}

const ListGroup = ({ children }: ListGroupProps) => (
  <ul style={{ listStyle: 'none', margin: 0 }}>{[children]}</ul>
);

export const AutoRefreshControls = ({ refreshInterval, setRefresh, disableInterval }: Props) => {
  const RefreshItem = ({ duration, label }: RefreshItemProps) => (
    <li>
      <EuiLink onClick={() => setRefresh(duration)}>{label}</EuiLink>
    </li>
  );

  const interval = timeDuration(refreshInterval);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="xs">
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>{strings.getRefreshListTitleText()}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {refreshInterval > 0 ? (
                  <Fragment>
                    <span>{timeStrings.getCycleTimeText(interval.length, interval.format)}</span>
                  </Fragment>
                ) : (
                  <span>{strings.getRefreshListDurationManualText()}</span>
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
              {refreshInterval > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip position="bottom" content={strings.getDisableTooltipText()}>
                    <EuiButtonIcon
                      iconType="cross"
                      onClick={disableInterval}
                      aria-label={strings.getDisableTooltipText()}
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

        <EuiFormLabel>{strings.getIntervalFormLabelText()}</EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration={5000} label={timeStrings.getSecondsText(5)} />
                <RefreshItem duration={15000} label={timeStrings.getSecondsText(15)} />
                <RefreshItem duration={30000} label={timeStrings.getSecondsText(30)} />
                <RefreshItem duration={60000} label={timeStrings.getMinutesText(1)} />
                <RefreshItem duration={300000} label={timeStrings.getMinutesText(5)} />
                <RefreshItem duration={900000} label={timeStrings.getMinutesText(15)} />
              </ListGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration={1800000} label={timeStrings.getMinutesText(30)} />
                <RefreshItem duration={3600000} label={timeStrings.getHoursText(1)} />
                <RefreshItem duration={7200000} label={timeStrings.getHoursText(2)} />
                <RefreshItem duration={21600000} label={timeStrings.getHoursText(6)} />
                <RefreshItem duration={43200000} label={timeStrings.getHoursText(12)} />
                <RefreshItem duration={86400000} label={timeStrings.getHoursText(24)} />
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
