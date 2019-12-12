/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

export const EagerGlobalOrdinalsParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsFieldTitle', {
      defaultMessage: 'Use eager global ordinals',
    })}
    description={i18n.translate(
      'xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsFieldDescription',
      {
        defaultMessage: 'Whether to load global ordinals on refresh.',
      }
    )}
    formFieldPath="eager_global_ordinals"
  />
);
