/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationService } from '../../../../services/documentation';

export const DocumentFieldsHeader = () => {
  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.idxMgmt.mappingsEditor.documentFieldsTitle', {
            defaultMessage: 'Mapped fields',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.documentFieldsDescription"
          defaultMessage="Define the fields you expect your indexed documents to have. {docsLink}"
          values={{
            docsLink: (
              <EuiLink href={documentationService.getMappingTypesLink()} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.documentFieldsDocumentationLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};
