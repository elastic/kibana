/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { IndicesGetMappingResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
  EuiPopover,
  EuiText,
  EuiSpacer,
  Pagination,
  EuiBadge,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { resultMetaData, resultToFieldFromMappingResponse } from './result/result_metadata';

import { Result } from '..';
import { type ResultProps } from './result/result';

interface DocumentListProps {
  executionTime?: number;
  dataTelemetryIdPrefix: string;
  docs: SearchHit[];
  docsPerPage: number;
  isLoading: boolean;
  mappings: IndicesGetMappingResponse | undefined;
  meta: Pagination;
  onPaginate: (newPageIndex: number) => void;
  setDocsPerPage?: (docsPerPage: number) => void;
  onDocumentClick?: (doc: SearchHit) => void;
  resultProps?: Partial<ResultProps>;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  executionTime,
  dataTelemetryIdPrefix,
  docs,
  docsPerPage,
  isLoading,
  mappings,
  meta,
  onPaginate,
  setDocsPerPage,
  onDocumentClick,
  resultProps = {},
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const getIconType = (size: number) => {
    return size === docsPerPage ? 'check' : 'empty';
  };

  const pageCount = meta?.pageSize ? Math.ceil(meta.totalItemCount / meta?.pageSize) : 0;
  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="xs">
            <p>
              <FormattedMessage
                id="xpack.searchIndexDocuments.documentList.description"
                defaultMessage="Showing {results} of {total}.
          Search results maxed at {maximum} documents."
                values={{
                  maximum: <FormattedNumber value={10000} />,
                  results: (
                    <strong>
                      <FormattedNumber value={docs.length} />
                    </strong>
                  ),
                  total: (
                    <strong>
                      <FormattedNumber value={meta.totalItemCount} />
                    </strong>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        {executionTime !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiBadge data-test-subj="executionTimeBadge" color="default">
              {executionTime} ms
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isLoading && <EuiProgress size="xs" color="primary" />}
      <EuiSpacer size="m" />
      {docs.map((doc) => {
        return (
          <React.Fragment key={doc._id}>
            <Result
              fields={resultToFieldFromMappingResponse(doc, mappings)}
              metaData={resultMetaData(doc)}
              onDocumentClick={onDocumentClick ? () => onDocumentClick(doc) : undefined}
              {...resultProps}
            />
          </React.Fragment>
        );
      })}

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiPagination
            aria-label={i18n.translate(
              'xpack.searchIndexDocuments.documentList.paginationAriaLabel',
              {
                defaultMessage: 'Pagination for document list',
              }
            )}
            pageCount={pageCount}
            activePage={meta.pageIndex}
            onPageClick={onPaginate}
          />
        </EuiFlexItem>
        {setDocsPerPage && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={i18n.translate('xpack.searchIndexDocuments.documentList.docsPerPage', {
                defaultMessage: 'Document count per page dropdown',
              })}
              button={
                <EuiButtonEmpty
                  data-telemetry-id={`${dataTelemetryIdPrefix}-documents-docsPerPage`}
                  size="s"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => {
                    setIsPopoverOpen(true);
                  }}
                >
                  {i18n.translate(
                    'xpack.searchIndexDocuments.documentList.pagination.itemsPerPage',
                    {
                      defaultMessage: 'Documents per page: {docPerPage}',
                      values: { docPerPage: docsPerPage },
                    }
                  )}
                </EuiButtonEmpty>
              }
              isOpen={isPopoverOpen}
              closePopover={() => {
                setIsPopoverOpen(false);
              }}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel
                size="s"
                items={[
                  <EuiContextMenuItem
                    key="10 rows"
                    icon={getIconType(10)}
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setDocsPerPage(10);
                    }}
                  >
                    {i18n.translate(
                      'xpack.searchIndexDocuments.documentList.paginationOptions.option',
                      {
                        defaultMessage: '{docCount} documents',
                        values: { docCount: 10 },
                      }
                    )}
                  </EuiContextMenuItem>,

                  <EuiContextMenuItem
                    key="25 rows"
                    icon={getIconType(25)}
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setDocsPerPage(25);
                    }}
                  >
                    {i18n.translate(
                      'xpack.searchIndexDocuments.documentList.paginationOptions.option',
                      {
                        defaultMessage: '{docCount} documents',
                        values: { docCount: 25 },
                      }
                    )}
                  </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    key="50 rows"
                    icon={getIconType(50)}
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setDocsPerPage(50);
                    }}
                  >
                    {i18n.translate(
                      'xpack.searchIndexDocuments.documentList.paginationOptions.option',
                      {
                        defaultMessage: '{docCount} documents',
                        values: { docCount: 50 },
                      }
                    )}
                  </EuiContextMenuItem>,
                ]}
              />
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer />
      {meta.totalItemCount > 9999 && (
        <EuiCallOut
          size="s"
          title={
            <FormattedMessage
              id="xpack.searchIndexDocuments.documentList.resultLimitTitle"
              defaultMessage="Results are limited to {number} documents"
              values={{
                number: <FormattedNumber value={10000} />,
              }}
            />
          }
          iconType="search"
        >
          <p>
            <FormattedMessage
              id="xpack.searchIndexDocuments.documentList.resultLimit"
              defaultMessage="Only the first {number} results are available for paging. Please use the search bar to filter down your results."
              values={{
                number: <FormattedNumber value={10000} />,
              }}
            />
          </p>
        </EuiCallOut>
      )}
    </>
  );
};
