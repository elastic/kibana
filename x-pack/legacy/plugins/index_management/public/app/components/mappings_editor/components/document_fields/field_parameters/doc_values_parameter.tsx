/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { documentationService } from '../../../../../services/documentation';

type DocValuesParameterNames = 'doc_values' | 'doc_values_binary';

export const DocValuesParameter = ({
  configPath = 'doc_values',
}: {
  configPath?: DocValuesParameterNames;
}) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.docValuesFieldTitle', {
      defaultMessage: 'Save doc values',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.docValuesFieldDescription', {
      defaultMessage:
        'Whether to store fields on disk in a column-stride fashion, so that it can later be used for sorting, aggregations, or scripting.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.docValuesDocLinkText', {
        defaultMessage: 'Doc values documentation',
      }),
      href: documentationService.getDocValuesLink(),
    }}
    formFieldPath="doc_values"
    configPath={configPath}
  />
);
