/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiText } from '@elastic/eui';
import { FunctionComponent } from 'react';

export interface Props {
  /**
   * keyboard shortcut to display in a tooltip
   */
  shortcut: string;
}

export const ToolTipShortcut: FunctionComponent<Props> = ({ shortcut }) => (
  <EuiText size="xs" textAlign="center" color="ghost">
    {shortcut.replace(/\+/g, ' + ')}
  </EuiText>
);

ToolTipShortcut.propTypes = {
  shortcut: PropTypes.string.isRequired,
};
