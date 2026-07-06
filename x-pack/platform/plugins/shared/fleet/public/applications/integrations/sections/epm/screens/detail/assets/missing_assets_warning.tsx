/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';

export const MISSING_ASSETS_WARNING_LABEL = i18n.translate(
  'xpack.fleet.epm.packageDetails.assets.installFailedLabel',
  {
    defaultMessage: 'Install failed',
  }
);

export const MISSING_ASSETS_WARNING_MSG = i18n.translate(
  'xpack.fleet.epm.packageDetails.assets.missingAssetsWarningMsg',
  {
    defaultMessage: 'Install failed: One more assets could not be found in Elasticsearch.',
  }
);

export const MissingAssetsWarning = () => {
  return (
    <EuiIconTip
      display="inlineBlock"
      content={MISSING_ASSETS_WARNING_MSG}
      title={MISSING_ASSETS_WARNING_LABEL}
      type="error"
      color="danger"
    />
  );
};
