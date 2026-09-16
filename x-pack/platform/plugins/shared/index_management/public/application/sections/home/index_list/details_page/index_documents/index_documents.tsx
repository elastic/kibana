/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { DocumentList } from './document_list';
import type { MappingsResponse } from '../../../../../../../common';

interface IndexDocumentsProps {
  documents: SearchHit[];
  isLoading: boolean;
  mappings?: MappingsResponse;
  onRefresh: () => void;
}

export const IndexDocuments: React.FC<IndexDocumentsProps> = ({
  documents,
  isLoading,
  mappings,
  onRefresh,
}) => {
  const mappingProperties = mappings?.mappings?.properties;

  if (documents.length === 0) {
    return null;
  }
  return (
    <>
      <EuiFlexGroup
        direction="row"
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            direction="row"
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.data.preview.title"
                    defaultMessage="Data preview"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.data.preview.description"
                    defaultMessage="Max 10 documents displayed."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="refresh"
            size="s"
            onClick={onRefresh}
            isLoading={isLoading}
            isDisabled={isLoading}
            data-test-subj="indexDetailsDataPreviewRefreshButton"
          >
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.data.preview.refreshButtonLabel"
              defaultMessage="Refresh"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <DocumentList docs={documents} mappingProperties={mappingProperties ?? {}} />
    </>
  );
};
