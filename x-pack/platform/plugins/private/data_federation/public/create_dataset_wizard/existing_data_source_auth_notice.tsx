/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';

import { ESQL_DATA_FEDERATION_DATA_SOURCES_DOCUMENTATION_URL } from '../data_federation_documentation_urls';
import { mainTranslations } from '../main_i18n';
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
        <p>
          {datasetWizardStrings.existingDataSourceAuthNoticeBody()}{' '}
          <EuiLink
            href={ESQL_DATA_FEDERATION_DATA_SOURCES_DOCUMENTATION_URL}
            target="_blank"
            external
            data-test-subj="datasetWizardExistingDataSourceAuthNoticeLearnMore"
          >
            {mainTranslations.docsLink}
          </EuiLink>
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
