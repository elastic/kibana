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
              'By default, documents that contain the wrong data type for a field are not indexed. If enabled, these documents are indexed, but fields with the wrong data type are filtered out. Be careful: if too many documents are indexed this way, queries on the field become meaningless.',
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
