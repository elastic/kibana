/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

export const Tray = ({ children, done }) => {
  return (
    <Fragment>
      <EuiFlexGroup className="canvasTray__toggle" justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon size="s" onClick={done} aria-label="Close tray" iconType="arrowDown" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <div className="canvasTray">{children}</div>
    </Fragment>
  );
};

Tray.propTypes = {
  children: PropTypes.node,
  done: PropTypes.func,
};
