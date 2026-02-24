/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer, EuiHorizontalRule, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocumentList } from './document_list';
import { useLoadIndexDocumentsSample } from '../../../../../services/api';
import type { MappingsResponse } from '../../../../../../../common';

interface IndexDocumentsProps {
  indexName: string;
  mappings?: MappingsResponse;
}

export const IndexDocuments: React.FC<IndexDocumentsProps> = ({ indexName, mappings }) => {
  const { data, isLoading, error } = useLoadIndexDocumentsSample(indexName);
  const documents = data?.results ?? [];
  const mappingProperties = mappings?.mappings?.properties;

  if (isLoading || error || documents.length === 0) {
    return null;
  }
  return (
    <EuiFlexItem>
      <EuiHorizontalRule />
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.data.preview.title"
            defaultMessage="Data preview"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <DocumentList docs={documents} mappingProperties={mappingProperties ?? {}} />
    </EuiFlexItem>
  );
};
