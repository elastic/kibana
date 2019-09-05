/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import PropTypes from 'prop-types';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { timeDurationString } from '../../../lib/time_duration';
import { CustomInterval } from './custom_interval';

import { ComponentStrings, UnitStrings } from '../../../../i18n';
const { WorkpadHeaderKioskControls: strings } = ComponentStrings;
const { time: timeStrings } = UnitStrings;

interface Props {
  autoplayEnabled: boolean;
  autoplayInterval: number;
  onSetEnabled: (enabled: boolean) => void;
  onSetInterval: (interval: number) => void;
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

export const KioskControls = ({
  autoplayEnabled,
  autoplayInterval,
  onSetEnabled,
  onSetInterval,
}: Props) => {
  const RefreshItem = ({ duration, label }: RefreshItemProps) => (
    <li>
      <EuiLink onClick={() => onSetInterval(duration)}>{label}</EuiLink>
    </li>
  );

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiDescriptionList textStyle="reverse">
          <EuiDescriptionListTitle>{strings.getTitleText()}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <span>
              {strings.getCycleIntervalPrefix()} {timeDurationString(autoplayInterval)}
            </span>
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
        <EuiHorizontalRule margin="m" />

        <div>
          <EuiSwitch
            checked={autoplayEnabled}
            label={strings.getCycleSwitchLabelText()}
            onChange={ev => onSetEnabled(ev.target.checked)}
          />
          <EuiSpacer size="m" />
        </div>

        <EuiFormLabel>{strings.getCycleFormLabelText()}</EuiFormLabel>
        <EuiSpacer size="s" />

        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration={5000} label={timeStrings.getSecondsText(5)} />
                <RefreshItem duration={10000} label={timeStrings.getSecondsText(10)} />
                <RefreshItem duration={30000} label={timeStrings.getSecondsText(30)} />
              </ListGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration={60000} label={timeStrings.getMinutesText(1)} />
                <RefreshItem duration={300000} label={timeStrings.getMinutesText(5)} />
                <RefreshItem duration={900000} label={timeStrings.getMinutesText(15)} />
              </ListGroup>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <CustomInterval onSubmit={value => onSetInterval(value)} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

KioskControls.propTypes = {
  autoplayEnabled: PropTypes.bool.isRequired,
  autoplayInterval: PropTypes.number.isRequired,
  onSetEnabled: PropTypes.func.isRequired,
  onSetInterval: PropTypes.func.isRequired,
};
