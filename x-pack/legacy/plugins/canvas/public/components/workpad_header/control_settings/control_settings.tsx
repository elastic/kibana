/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
// @ts-ignore untyped local
import { Popover } from '../../popover';
import { AutoRefreshControls } from './auto_refresh_controls';
import { KioskControls } from './kiosk_controls';

import { ComponentStrings } from '../../../../i18n';
const { WorkpadHeaderControlSettings: strings } = ComponentStrings;

interface Props {
  refreshInterval: number;
  setRefreshInterval: (interval: number | undefined) => void;
  autoplayEnabled: boolean;
  autoplayInterval: number;
  enableAutoplay: (enable: boolean) => void;
  setAutoplayInterval: (interval: number | undefined) => void;
}

export const ControlSettings = ({
  setRefreshInterval,
  refreshInterval,
  autoplayEnabled,
  autoplayInterval,
  enableAutoplay,
  setAutoplayInterval,
}: Props) => {
  const setRefresh = (val: number | undefined) => setRefreshInterval(val);

  const disableInterval = () => {
    setRefresh(0);
  };

  const popoverButton = (handleClick: MouseEventHandler<HTMLButtonElement>) => (
    <EuiToolTip position="bottom" content={strings.getTooltip()}>
      <EuiButtonIcon iconType="gear" aria-label={strings.getTooltip()} onClick={handleClick} />
    </EuiToolTip>
  );

  return (
    <Popover
      id="auto-refresh-popover"
      button={popoverButton}
      anchorPosition="rightUp"
      panelClassName="canvasControlSettings__popover"
    >
      {() => (
        <EuiFlexGroup>
          <EuiFlexItem>
            <AutoRefreshControls
              refreshInterval={refreshInterval}
              setRefresh={val => setRefresh(val)}
              disableInterval={() => disableInterval()}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <KioskControls
              autoplayEnabled={autoplayEnabled}
              autoplayInterval={autoplayInterval}
              onSetInterval={setAutoplayInterval}
              onSetEnabled={enableAutoplay}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </Popover>
  );
};

ControlSettings.propTypes = {
  refreshInterval: PropTypes.number,
  setRefreshInterval: PropTypes.func.isRequired,
  autoplayEnabled: PropTypes.bool,
  autoplayInterval: PropTypes.number,
  enableAutoplay: PropTypes.func.isRequired,
  setAutoplayInterval: PropTypes.func.isRequired,
};
