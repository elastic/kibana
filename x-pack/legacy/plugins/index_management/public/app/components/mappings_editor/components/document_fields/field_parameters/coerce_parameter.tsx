/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

type CoerceParameterNames = 'coerce' | 'coerce_geo_shape' | 'coerce_shape';

export const CoerceParameter = ({
  configPath = 'coerce',
}: {
  configPath?: CoerceParameterNames;
}) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.coerceFieldTitle', {
      defaultMessage: 'Coerce to number',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.coerceDescription', {
      defaultMessage:
        'Whether to try to convert strings to numbers and truncate fractions for integers.',
    })}
    formFieldPath="coerce"
    configPath={configPath}
  />
);
