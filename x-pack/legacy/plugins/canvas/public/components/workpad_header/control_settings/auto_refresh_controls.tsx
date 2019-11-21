/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiHorizontalRule,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiTitle,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { timeDuration } from '../../../lib/time_duration';
import { RefreshControl } from '../refresh_control';
import { CustomInterval } from './custom_interval';

import { ComponentStrings, UnitStrings } from '../../../../i18n';
const { WorkpadHeaderAutoRefreshControls: strings } = ComponentStrings;
const { time: timeStrings } = UnitStrings;
const { getSecondsText, getMinutesText, getHoursText } = timeStrings;

interface Props {
  refreshInterval: number;
  setRefresh: (interval: number | undefined) => void;
  disableInterval: () => void;
}

interface ListGroupProps {
  'aria-labelledby': string;
  className: string;
  children: ReactNode;
}

interface RefreshItemProps {
  duration: number;
  label: string;
  descriptionId: string;
}

const ListGroup = ({ children, ...rest }: ListGroupProps) => (
  <ul style={{ listStyle: 'none', margin: 0 }} {...rest}>
    {[children]}
  </ul>
);

const generateId = htmlIdGenerator();

export const AutoRefreshControls = ({ refreshInterval, setRefresh, disableInterval }: Props) => {
  const RefreshItem = ({ duration, label, descriptionId }: RefreshItemProps) => (
    <li>
      <EuiLink onClick={() => setRefresh(duration)} aria-describedby={descriptionId}>
        {label}
      </EuiLink>
    </li>
  );

  const interval = timeDuration(refreshInterval);
  const intervalTitleId = generateId();

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="xs">
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>{strings.getRefreshListTitle()}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {refreshInterval > 0 ? (
                  <>{timeStrings.getCycleTimeText(interval.length, interval.format)}</>
                ) : (
                  <>{strings.getRefreshListDurationManualText()}</>
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
              {refreshInterval > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip position="bottom" content={strings.getDisableTooltip()}>
                    <EuiButtonIcon
                      iconType="cross"
                      onClick={disableInterval}
                      aria-label={strings.getDisableTooltip()}
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

        <EuiTitle size="xxxs" id={intervalTitleId}>
          <p>{strings.getIntervalFormLabelText()}</p>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <ListGroup aria-labelledby={intervalTitleId} className="canvasControlSettings__list">
            <RefreshItem
              duration={5000}
              label={getSecondsText(5)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={15000}
              label={getSecondsText(15)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={30000}
              label={getSecondsText(30)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={60000}
              label={getMinutesText(1)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={300000}
              label={getMinutesText(5)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={900000}
              label={getMinutesText(15)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={1800000}
              label={getMinutesText(30)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={3600000}
              label={getHoursText(1)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={7200000}
              label={getHoursText(2)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={21600000}
              label={getHoursText(6)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={43200000}
              label={getHoursText(12)}
              descriptionId={intervalTitleId}
            />
            <RefreshItem
              duration={86400000}
              label={getHoursText(24)}
              descriptionId={intervalTitleId}
            />
          </ListGroup>
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
