/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MappingEditorSectionHeader = () => {
  return (
    <>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.dataFederation.mappingEditor.title', {
            defaultMessage: 'Dataset mappings',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.dataFederation.mappingEditor.description', {
            defaultMessage:
              'Declare a schema, rename physical columns using “path”, and optionally add a date “format”.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};

