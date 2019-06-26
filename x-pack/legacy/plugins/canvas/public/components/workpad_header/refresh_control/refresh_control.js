/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ToolTipShortcut } from '../../tool_tip_shortcut';

export const RefreshControl = ({ doRefresh, inFlight }) => (
  <EuiToolTip
    position="bottom"
    content={
      <span>
        Refresh data
        <ToolTipShortcut namespace="EDITOR" action="REFRESH" />
      </span>
    }
  >
    <EuiButtonIcon
      disabled={inFlight}
      iconType="refresh"
      aria-label="Refresh Elements"
      onClick={doRefresh}
    />
  </EuiToolTip>
);

RefreshControl.propTypes = {
  doRefresh: PropTypes.func.isRequired,
  inFlight: PropTypes.bool,
};
