/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { MappingProperty, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';

import {
  Result,
  resultMetaData,
  resultToField,
  reorderFieldsInImportance,
} from '@kbn/search-index-documents';

import { EuiSpacer } from '@elastic/eui';

import { deleteDocuments } from '../../../../../services/api';
import { notificationService } from '../../../../../services/notification';
import { RecentDocsActionMessage } from './recent_docs_action_message';

export interface DocumentListProps {
  indexName: string;
  docs: SearchHit[];
  mappingProperties: Record<string, MappingProperty>;
  hasDeleteDocumentsPrivilege: boolean;
  onDocumentsRefresh: () => void;
}

export const DocumentList = ({
  indexName,
  docs,
  mappingProperties,
  hasDeleteDocumentsPrivilege,
  onDocumentsRefresh,
}: DocumentListProps) => {
  const handleDocumentDelete = useCallback(
    async (docId: string) => {
      const { error } = await deleteDocuments(indexName, docId);
      if (error) {
        notificationService.showDangerToast(
          error.message ??
            i18n.translate('xpack.idxMgmt.documentList.documentDeleteErrorMessage', {
              defaultMessage: 'Failed to delete document.',
            })
        );
      } else {
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.documentList.documentDeletedMessage', {
            defaultMessage: 'Document {docId} was deleted from index {indexName}.',
            values: { docId, indexName },
          })
        );
        onDocumentsRefresh();
      }
    },
    [indexName, onDocumentsRefresh]
  );

  return (
    <>
      <RecentDocsActionMessage indexName={indexName} />
      <EuiSpacer size="m" />
      {docs.map((doc) => {
        return (
          <React.Fragment key={doc._id}>
            <Result
              fields={reorderFieldsInImportance(resultToField(doc, mappingProperties))}
              metaData={resultMetaData(doc)}
              onDocumentDelete={() => {
                handleDocumentDelete(doc._id!);
              }}
              compactCard={false}
              hasDeleteDocumentsPrivilege={hasDeleteDocumentsPrivilege}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
    </>
  );
};
