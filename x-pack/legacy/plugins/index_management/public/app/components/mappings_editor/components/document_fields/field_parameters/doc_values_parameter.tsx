/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

type DocValuesParameterNames = 'doc_values' | 'doc_values_binary';

export const DocValuesParameter = ({
  configPath = 'doc_values',
}: {
  configPath?: DocValuesParameterNames;
}) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.docValuesFieldTitle', {
      defaultMessage: 'Use doc values',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.docValuesFieldDescription', {
      defaultMessage:
        'Store fields on disk in a column-stride fashion for use in sorting, aggregations, and scripting.',
    })}
    formFieldPath="doc_values"
    configPath={configPath}
  />
);
