/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { CustomCallout } from './custom_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import { EmptyPromptBody } from '../../../empty_prompt_body';
import { EmptyPromptTitle } from '../../../empty_prompt_title';
import { getAllCustomMarkdownComments } from './utils/markdown';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../../../../../types';
import { useDataQualityContext } from '../../../../../../../data_quality_context';
import { StickyActions } from '../sticky_actions';
import { getCustomTableColumns } from './utils/get_custom_table_columns';
import { CUSTOM_EMPTY, CUSTOM_EMPTY_TITLE, CUSTOM_FIELDS_TABLE_TITLE } from '../../../translations';

interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}

const CustomTabComponent: React.FC<Props> = ({
  docsCount,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}) => {
  const { formatBytes, formatNumber, isILMAvailable } = useDataQualityContext();
  const markdownComment: string = useMemo(
    () =>
      getAllCustomMarkdownComments({
        docsCount,
        formatBytes,
        formatNumber,
        ilmPhase,
        indexName,
        isILMAvailable,
        partitionedFieldMetadata,
        patternDocsCount,
        sizeInBytes,
      }).join('\n'),
    [
      docsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      indexName,
      isILMAvailable,
      partitionedFieldMetadata,
      patternDocsCount,
      sizeInBytes,
    ]
  );

  const body = useMemo(() => <EmptyPromptBody body={CUSTOM_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={CUSTOM_EMPTY_TITLE} />, []);

  return (
    <div data-test-subj="customTabContent">
      {partitionedFieldMetadata.custom.length > 0 ? (
        <>
          <CustomCallout fieldCount={partitionedFieldMetadata.custom.length} />

          <EuiSpacer />

          <CompareFieldsTable
            enrichedFieldMetadata={partitionedFieldMetadata.custom}
            getTableColumns={getCustomTableColumns}
            title={CUSTOM_FIELDS_TABLE_TITLE(indexName)}
          />

          <EuiSpacer size="m" />
          <StickyActions markdownComment={markdownComment} showCopyToClipboardAction={true} />
        </>
      ) : (
        <EuiEmptyPrompt body={body} title={title} titleSize="s" />
      )}
    </div>
  );
};

CustomTabComponent.displayName = 'CustomTabComponent';

export const CustomTab = React.memo(CustomTabComponent);
