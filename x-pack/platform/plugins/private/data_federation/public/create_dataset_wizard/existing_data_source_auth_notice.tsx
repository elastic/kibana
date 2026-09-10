/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { datasetWizardStrings } from './dataset_wizard_i18n';

export const ExistingDataSourceAuthNotice = ({ show }: { show: boolean }) => {
  if (!show) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        color="primary"
        iconType="info"
        title={datasetWizardStrings.existingDataSourceAuthNoticeTitle()}
        data-test-subj="datasetWizardExistingDataSourceAuthNotice"
      >
        <p>{datasetWizardStrings.existingDataSourceAuthNoticeBody()}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
