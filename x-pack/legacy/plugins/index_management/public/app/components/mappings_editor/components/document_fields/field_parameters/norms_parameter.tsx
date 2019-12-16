/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

export const NormsParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldTitle', {
      defaultMessage: 'Use norms',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldDescription', {
      defaultMessage: 'Whether field-length should be taken into account when scoring queries.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.normsDocLinkText', {
        defaultMessage: 'Norms documentation',
      }),
      href: documentationService.getNormsLink(),
    }}
    formFieldPath="norms"
  />
);
