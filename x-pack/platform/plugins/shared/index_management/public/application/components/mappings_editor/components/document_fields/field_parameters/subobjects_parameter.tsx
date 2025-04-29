/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

export const SubobjectsParameter = () => {
  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.subobjectsParameter.fieldTitle', {
        defaultMessage: 'Subobjects',
      })}
      description={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.subobjectsParameter.fieldDescription',
        {
          defaultMessage:
            'Allow object to hold further subobjects. If disabled, documents can be stored with field names that contain dots and share common prefixes.',
        }
      )}
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.subobjectsDocLinkText', {
          defaultMessage: 'Subobjects documentation',
        }),
        href: documentationService.getSubobjectsLink(),
      }}
      formFieldPath="subobjects"
    />
  );
};
