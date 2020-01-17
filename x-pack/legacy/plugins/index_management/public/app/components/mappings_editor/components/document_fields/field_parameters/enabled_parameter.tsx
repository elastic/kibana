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
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.enabledParameter.fieldTitle', {
        defaultMessage: 'Parse and index the JSON value for the object',
      })}
      description={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.enabledParameter.fieldDescription',
        {
          defaultMessage:
            'If you disable this setting Elasticsearch will skip parsing the contents of the field entirely. The JSON can still be retrieved from the _source field, but it is not searchable or stored in any other way.',
        }
      )}
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
