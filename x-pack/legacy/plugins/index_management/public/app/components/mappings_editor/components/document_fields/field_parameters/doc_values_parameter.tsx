/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

export const DocValuesParameter = () => (
  <EditFieldFormRow
    title={
      <h3>
        {i18n.translate('xpack.idxMgmt.mappingsEditor.docValuesFieldTitle', {
          defaultMessage: 'Save doc values',
        })}
      </h3>
    }
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.docValuesFieldDescription', {
      defaultMessage: 'Whether to store fields on disk in a column-stride fashion.',
    })}
    formFieldPath="doc_values"
  />
);
