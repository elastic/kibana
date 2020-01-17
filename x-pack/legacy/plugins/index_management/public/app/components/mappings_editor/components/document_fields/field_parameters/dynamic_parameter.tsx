/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

export const DynamicParameter = () => {
  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicPropertiesFieldTitle', {
        defaultMessage: 'Dynamically add new properies',
      })}
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicDocLinkText', {
          defaultMessage: 'Dynamic documentation',
        }),
        href: documentationService.getParameterDocLink('dynamic')!,
      }}
      formFieldPath="dynamic"
    />
  );
};
