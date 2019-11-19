/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DocumentFieldsHeaders = () => {
  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.idxMgmt.mappingsEditor.documentFieldsTitle', {
            defaultMessage: 'Document fields',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.idxMgmt.mappingsEditor.documentFieldsDescription', {
          defaultMessage: 'Define which fields the documents of your index will contain.',
        })}
      </EuiText>
    </>
  );
};
