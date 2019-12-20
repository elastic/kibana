/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { documentationService } from '../../../../../services/documentation';

export const CoerceNumberParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.coerceFieldTitle', {
      defaultMessage: 'Coerce to number',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.coerceDescription', {
      defaultMessage:
        'Convert strings to numbers. If this field is an integer type, fractions will be truncated. If coercion is disabled then documents with imperfectly formatted values will be rejected.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.coerceDocLinkText', {
        defaultMessage: 'Coerce documentation',
      }),
      href: documentationService.getCoerceLink(),
    }}
    formFieldPath="coerce"
  />
);
