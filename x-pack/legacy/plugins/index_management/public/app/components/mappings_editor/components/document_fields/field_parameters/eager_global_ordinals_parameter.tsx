/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { documentationService } from '../../../../../services/documentation';

export const EagerGlobalOrdinalsParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsFieldTitle', {
      defaultMessage: 'Allow eager global ordinals',
    })}
    description={i18n.translate(
      'xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsFieldDescription',
      {
        defaultMessage:
          'Load global ordinals on refresh. This is useful on fields that are frequently used for terms aggregations.',
      }
    )}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsDocLinkText', {
        defaultMessage: 'Global ordinals documentation',
      }),
      href: documentationService.getEagerGlobalOrdinalsLink(),
    }}
    formFieldPath="eager_global_ordinals"
  />
);
