/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

export const NormsParameter = () => (
  <EditFieldFormRow
    title={
      <h3>
        {i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldTitle', {
          defaultMessage: 'Use norms',
        })}
      </h3>
    }
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldDescription', {
      defaultMessage: 'Whether field-length should be taken into account when scoring queries.',
    })}
    formFieldPath="norms"
    direction="column"
  >
    <EuiCallOut color="warning">
      <p>
        {i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldWarningMessage', {
          defaultMessage: 'Enabling norms requires a lot of disk use.',
        })}
      </p>
    </EuiCallOut>
  </EditFieldFormRow>
);
