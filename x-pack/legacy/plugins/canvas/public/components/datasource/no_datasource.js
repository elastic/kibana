/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCallOut } from '@elastic/eui';

import { ComponentStrings } from '../../../i18n';
const { DatasourceNoDatasource: strings } = ComponentStrings;

export const NoDatasource = () => (
  <div className="canvasDataSource__section">
    <EuiCallOut title={strings.getPanelTitle()} iconType="iInCircle">
      <p>{strings.getPanelDescription()}</p>
    </EuiCallOut>
  </div>
);

NoDatasource.propTypes = {
  done: PropTypes.func,
};
