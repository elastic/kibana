/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

export const EnabledParameter = () => {
  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.enabledPropertiesFieldTitle', {
        defaultMessage: 'Parse and index the JSON value for the object',
      })}
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.enabledDocLinkText', {
          defaultMessage: 'Enabled documentation',
        }),
        href: documentationService.getParameterDocLink('enabled')!,
      }}
      formFieldPath="enabled"
    />
  );
};
