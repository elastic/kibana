/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

export const EnabledParameter = () => {
  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.searchableProperties.fieldTitle', {
        defaultMessage: 'Searchable properties',
      })}
      description={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.searchableProperties.fieldDescription"
          defaultMessage="Allow object properties to be searched. The JSON can still be retrieved from the {source} field even after disabling this setting."
          values={{
            source: <EuiCode>_source</EuiCode>,
          }}
        />
      }
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.enabledDocLinkText', {
          defaultMessage: 'Enabled documentation',
        }),
        href: documentationService.getEnabledLink(),
      }}
      formFieldPath="enabled"
    />
  );
};
