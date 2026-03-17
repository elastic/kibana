/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiPageSection, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const SettingsPage = () => {
  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.knowledgeMining.settings.title', {
          defaultMessage: 'Knowledge Mining Settings',
        })}
      />
      <EuiPageSection>
        <EuiEmptyPrompt
          title={
            <h3>
              {i18n.translate('xpack.knowledgeMining.settings.comingSoon', {
                defaultMessage: 'Settings',
              })}
            </h3>
          }
          body={i18n.translate('xpack.knowledgeMining.settings.description', {
            defaultMessage:
              'Configuration for automatic knowledge mining, conversation type filters, and mining frequency will be available here.',
          })}
        />
      </EuiPageSection>
    </>
  );
};
