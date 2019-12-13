/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

export const IgnoreZValueParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreZValueFieldTitle', {
      defaultMessage: 'Ignore Z value',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.ignoredMalformedFieldDescription', {
      defaultMessage:
        'If true, three dimension points will be accepted, but only latitude and longitude values will be indexed; the third dimension is ignored.',
    })}
    formFieldPath="ignore_z_value"
  />
);
