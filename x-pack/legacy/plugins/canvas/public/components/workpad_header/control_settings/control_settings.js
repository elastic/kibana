/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { Popover } from '../../popover';
import { AutoRefreshControls } from './auto_refresh_controls';
import { KioskControls } from './kiosk_controls';

export const ControlSettings = ({
  setRefreshInterval,
  refreshInterval,
  autoplayEnabled,
  autoplayInterval,
  enableAutoplay,
  setAutoplayInterval,
}) => {
  const setRefresh = val => setRefreshInterval(val);

  const disableInterval = () => {
    setRefresh(0);
  };

  const popoverButton = handleClick => (
    <EuiToolTip position="bottom" content="Control settings">
      <EuiButtonIcon iconType="gear" aria-label="Control settings" onClick={handleClick} />
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
