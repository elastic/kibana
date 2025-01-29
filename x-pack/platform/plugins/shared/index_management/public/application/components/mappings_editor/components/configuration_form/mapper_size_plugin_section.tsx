/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiCode } from '@elastic/eui';

import { documentationService } from '../../../../services/documentation';
import { UseField, FormRow, ToggleField } from '../../shared_imports';

export const MapperSizePluginSection = () => {
  return (
    <FormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.sizeTitle', {
        defaultMessage: '_size',
      })}
      description={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.sizeDescription"
          defaultMessage="The Mapper Size plugin can index the size of the original {_source} field. {docsLink}"
          values={{
            docsLink: (
              <EuiLink href={documentationService.docLinks.plugins.mapperSize} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.sizeDocumentionLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
            _source: <EuiCode>_source</EuiCode>,
          }}
        />
      }
    >
      <UseField
        path="_size.enabled"
        component={ToggleField}
        componentProps={{ 'data-test-subj': 'sizeEnabledToggle' }}
      />
    </FormRow>
  );
};
