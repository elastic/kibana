/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';

import { documentationService } from '../../../../../services/documentation';
import { getUseField, FormRow, Field, JsonEditor } from '../../../shared_imports';

const UseField = getUseField({ component: Field });

export const MetaFieldSection = () => (
  <FormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.metaFieldTitle', {
      defaultMessage: '_meta field',
    })}
    description={
      <>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.metaFieldDescription"
          defaultMessage="Use the _meta field to store any metadata you want. {docsLink}"
          values={{
            docsLink: (
              <EuiLink href={documentationService.getMetaFieldLink()} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.metaFieldDocumentionLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
          }}
        />
      </>
    }
  >
    <UseField path="metaField">
      {({ label, helpText, value, setValue }) => {
        return (
          <JsonEditor
            label={label}
            helpText={helpText}
            defaultValue={value as { [key: string]: any }}
            onUpdate={updatedJson => {
              if (updatedJson.isValid) {
                setValue(updatedJson.data.format());
              }
            }}
            euiCodeEditorProps={{
              height: '400px',
              'aria-label': i18n.translate(
                'xpack.idxMgmt.mappingsEditor.metaFieldEditorAriaLabel',
                {
                  defaultMessage: '_meta field data editor',
                }
              ),
            }}
          />
        );
      }}
    </UseField>
  </FormRow>
);
