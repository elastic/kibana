/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiText, EuiLink, EuiFlexGroup, EuiFlexItem, EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationService } from '../../../../services/documentation';

interface Props {
  searchValue: string;
  onSearchChange(value: string): void;
}

export const DocumentFieldsHeader = React.memo(({ searchValue, onSearchChange }: Props) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
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
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFieldSearch
          placeholder="Search fields"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search mapped fields"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
