/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiTitle,
  EuiToolTip,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { timeDuration } from '../../../lib/time_duration';
import { UnitStrings } from '../../../../i18n';
import { CustomInterval } from './custom_interval';

const { time: timeStrings } = UnitStrings;
const { getSecondsText, getMinutesText } = timeStrings;

const strings = {
  getCycleFormLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderKioskControl.cycleFormLabel', {
      defaultMessage: 'Change cycling interval',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.workpadHeaderKioskControl.controlTitle', {
      defaultMessage: 'Cycle fullscreen pages',
    }),
  getAutoplayListDurationManualText: () =>
    i18n.translate('xpack.canvas.workpadHeaderKioskControl.autoplayListDurationManual', {
      defaultMessage: 'Manually',
    }),
  getDisableTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeaderKioskControl.disableTooltip', {
      defaultMessage: 'Disable auto-play',
    }),
};

interface Props {
  autoplayInterval: number;
  onSetInterval: (interval: number) => void;
}

interface ListGroupProps {
  'aria-labelledby'?: string;
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

export const KioskControls = ({ autoplayInterval, onSetInterval }: Props) => {
  const disableAutoplay = useCallback(() => {
    onSetInterval(0);
  }, [onSetInterval]);

  const RefreshItem = ({ duration, label, descriptionId }: RefreshItemProps) => (
    <li>
      <EuiLink onClick={() => onSetInterval(duration)} aria-describedby={descriptionId}>
        {label}
      </EuiLink>
    </li>
  );

  const interval = timeDuration(autoplayInterval);
  const intervalTitleId = generateId();

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="spaceBetween"
      className="canvasViewMenu__kioskSettings"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="xs">
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>{strings.getTitle()}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {autoplayInterval > 0 ? (
                  <>{timeStrings.getCycleTimeText(interval.length, interval.format)}</>
                ) : (
                  <>{strings.getAutoplayListDurationManualText()}</>
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
              {autoplayInterval > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    position="bottom"
                    content={strings.getDisableTooltip()}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="cross"
                      onClick={disableAutoplay}
                      aria-label={strings.getDisableTooltip()}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />
        <EuiTitle size="xxxs" id={intervalTitleId}>
          <p>{strings.getCycleFormLabel()}</p>
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
              duration={10000}
              label={getSecondsText(10)}
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
          </ListGroup>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <CustomInterval onSubmit={(value) => onSetInterval(value)} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

KioskControls.propTypes = {
  autoplayInterval: PropTypes.number.isRequired,
  onSetInterval: PropTypes.func.isRequired,
};
