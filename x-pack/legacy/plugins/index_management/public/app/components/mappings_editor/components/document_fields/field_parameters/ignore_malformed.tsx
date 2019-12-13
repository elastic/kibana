/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

export const IgnoreMalformedParameter = ({ description }: { description?: string }) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreMalformedFieldTitle', {
      defaultMessage: 'Ignore malformed data',
    })}
    description={
      description
        ? description
        : i18n.translate('xpack.idxMgmt.mappingsEditor.ignoredMalformedFieldDescription', {
            defaultMessage: 'Whether to ignore malformed data.',
          })
    }
    formFieldPath="ignore_malformed"
  />
);
