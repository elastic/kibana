/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getPanelDescription: () =>
    i18n.translate('xpack.canvas.datasourceNoDatasource.panelDescription', {
      defaultMessage:
        "This element does not have an attached data source. This is usually because the element is an image or other static asset. If that's not the case you might want to check your expression to make sure it is not malformed.",
    }),
  getPanelTitle: () =>
    i18n.translate('xpack.canvas.datasourceNoDatasource.panelTitle', {
      defaultMessage: 'No data source present',
    }),
};

export const NoDatasource = () => (
  <div className="canvasDataSource__section">
    <EuiCallOut title={strings.getPanelTitle()} iconType="info">
      <p>{strings.getPanelDescription()}</p>
    </EuiCallOut>
  </div>
);

NoDatasource.propTypes = {
  done: PropTypes.func,
};
