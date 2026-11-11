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
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { DocumentList } from './document_list';
import type { MappingsResponse } from '../../../../../../../common';

interface IndexDocumentsProps {
  documents: SearchHit[];
  isLoading: boolean;
  error: { message?: string } | null;
  mappings?: MappingsResponse;
  onRefresh: () => void;
}

export const IndexDocuments: React.FC<IndexDocumentsProps> = ({
  documents,
  isLoading,
  error,
  mappings,
  onRefresh,
}) => {
  const mappingProperties = mappings?.mappings?.properties;
  const hasDocuments = documents.length > 0;
  // A refresh keeps the previous sample. Show status above that list instead of replacing it.
  const showErrorBanner = Boolean(error) && !isLoading;

  if (!hasDocuments && !error) {
    return null;
  }

  const errorTitle = i18n.translate('xpack.idxMgmt.indexDetails.data.preview.loadErrorTitle', {
    defaultMessage: 'Unable to load documents',
  });

  let errorText: string | undefined;
  if (hasDocuments && error?.message) {
    errorText = i18n.translate(
      'xpack.idxMgmt.indexDetails.data.preview.staleDocumentsWithReasonErrorMessage',
      {
        defaultMessage: 'Data preview may show stale data. {errorMessage}',
        values: { errorMessage: error.message },
      }
    );
  } else if (hasDocuments) {
    errorText = i18n.translate(
      'xpack.idxMgmt.indexDetails.data.preview.staleDocumentsErrorMessage',
      {
        defaultMessage: 'Data preview may show stale data.',
      }
    );
  } else if (error?.message) {
    errorText = error.message;
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
      {isLoading && (
        <>
          <EuiProgress
            size="xs"
            color="accent"
            data-test-subj="indexDetailsDataPreviewProgress"
            aria-label={i18n.translate(
              'xpack.idxMgmt.indexDetails.data.preview.loadingDocumentsAriaLabel',
              { defaultMessage: 'Loading documents' }
            )}
          />
          {hasDocuments && <EuiSpacer size="s" />}
        </>
      )}
      {showErrorBanner && (
        <>
          <KbnDangerCallout
            announceOnMount
            data-test-subj="indexDetailsDataPreviewError"
            title={errorTitle}
            text={errorText}
            aria-label={errorTitle}
            size="s"
          />
          {hasDocuments && <EuiSpacer size="m" />}
        </>
      )}
      {hasDocuments && (
        <DocumentList docs={documents} mappingProperties={mappingProperties ?? {}} />
      )}
    </>
  );
};
