/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { documentationService } from '../../../../../services/documentation';

export const CoerceShapeParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.coerceShapeFieldTitle', {
      defaultMessage: 'Coerce to shape',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.coerceShapeDescription', {
      defaultMessage: 'Unclosed linear rings in polygons will be automatically closed.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.coerceShapeDocLinkText', {
        defaultMessage: 'Coerce documentation',
      }),
      href: documentationService.getCoerceLink(),
    }}
    formFieldPath="coerce"
    configPath="coerce_shape"
  />
);
