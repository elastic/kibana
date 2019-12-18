/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
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
            defaultMessage:
              'Malformed data will not be indexed, but other fields in the document will be processed normally. The number of documents that have a malformed field should be contained, or queries on this field will become meaningless.',
          })
    }
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreMalformedDocLinkText', {
        defaultMessage: 'Ignore malformed documentation',
      }),
      href: documentationService.getIgnoreMalformedLink(),
    }}
    formFieldPath="ignore_malformed"
  />
);
