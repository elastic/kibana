/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSplitPanel,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ResultFields } from './results_fields';

import type { MetaDataProps, ResultFieldProps } from './result_types';
import { RichResultHeader } from './rich_result_header';
import { ResultHeader } from './result_header';

export const DEFAULT_VISIBLE_FIELDS = 3;

export interface ResultProps {
  fields: ResultFieldProps[];
  metaData: MetaDataProps;
  defaultVisibleFields?: number;
  showScore?: boolean;
  compactCard?: boolean;
  onDocumentClick?: () => void;
  onDocumentDelete?: () => void;
  hasDeleteDocumentsPrivilege?: boolean;
}

export const Result: React.FC<ResultProps> = ({
  metaData,
  fields,
  defaultVisibleFields = DEFAULT_VISIBLE_FIELDS,
  compactCard = true,
  showScore = false,
  onDocumentClick,
  onDocumentDelete,
  hasDeleteDocumentsPrivilege,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tooltipText =
    fields.length <= defaultVisibleFields
      ? i18n.translate('xpack.searchIndexDocuments.result.expandTooltip.allVisible', {
          defaultMessage: 'All fields are visible',
        })
      : isExpanded
      ? i18n.translate('xpack.searchIndexDocuments.result.expandTooltip.showFewer', {
          defaultMessage: 'Show {amount} fewer fields',
          values: { amount: fields.length - defaultVisibleFields },
        })
      : i18n.translate('xpack.searchIndexDocuments.result.expandTooltip.showMore', {
          defaultMessage: 'Show {amount} more fields',
          values: { amount: fields.length - defaultVisibleFields },
        });
  const toolTipContent = <>{tooltipText}</>;

  const showResultsFields = isExpanded ? fields.length > 0 : defaultVisibleFields > 0;

  const tooltipRef = useRef<EuiToolTip>(null);
  return (
    <>
      <EuiSplitPanel.Outer hasBorder={true} data-test-subj="search-index-documents-result">
        <EuiSplitPanel.Inner paddingSize="m" color="plain" className="resultHeaderContainer">
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem>
              {compactCard && (
                <ResultHeader
                  title={
                    metaData.title ??
                    i18n.translate('searchIndexDocuments.result.title.id', {
                      defaultMessage: 'Document id: {id}',
                      values: { id: metaData.id },
                    })
                  }
                  metaData={metaData}
                />
              )}

              {!compactCard && (
                <RichResultHeader
                  showScore={showScore}
                  title={
                    metaData.title ??
                    i18n.translate('searchIndexDocuments.result.title.id', {
                      defaultMessage: 'Document id: {id}',
                      values: { id: metaData.id },
                    })
                  }
                  onTitleClick={onDocumentClick}
                  metaData={{
                    ...metaData,
                    onDocumentDelete,
                    hasDeleteDocumentsPrivilege,
                  }}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip position="left" content={toolTipContent} ref={tooltipRef}>
                <EuiButtonIcon
                  size="xs"
                  iconType={isExpanded ? 'fold' : 'unfold'}
                  color={isExpanded ? 'danger' : 'primary'}
                  data-test-subj={isExpanded ? 'documentShowLessFields' : 'documentShowMoreFields'}
                  onClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                    tooltipRef.current?.showToolTip();
                  }}
                  aria-label={tooltipText}
                  aria-selected={isExpanded}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        {showResultsFields && (
          <>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="m">
              <ResultFields
                documentId={metaData.id}
                isExpanded={isExpanded}
                fields={isExpanded ? fields : fields.slice(0, defaultVisibleFields)}
              />
            </EuiSplitPanel.Inner>
          </>
        )}
      </EuiSplitPanel.Outer>
      {showResultsFields && <EuiSpacer size="s" />}
    </>
  );
};
