/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

export const StoreParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.storeFieldValueFieldTitle', {
      defaultMessage: 'Store field value',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.storeFieldValueFieldDescription', {
      defaultMessage: 'Store and retrieve the field value separate from the _source field.',
    })}
    formFieldPath="store"
  />
);
