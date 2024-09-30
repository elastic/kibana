/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { CustomCallout } from '../callouts/custom_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import { getCustomTableColumns } from '../compare_fields_table/helpers';
import { EmptyPromptBody } from '../../../empty_prompt_body';
import { EmptyPromptTitle } from '../../../empty_prompt_title';
import { getAllCustomMarkdownComments, showCustomCallout } from './helpers';
import * as i18n from '../../../translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../../../../../../types';
import { useDataQualityContext } from '../../../../../../../../data_quality_context';
import { StickyActions } from '../sticky_actions';

interface Props {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}

const CustomTabComponent: React.FC<Props> = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}) => {
  const { isILMAvailable } = useDataQualityContext();
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

  const body = useMemo(() => <EmptyPromptBody body={i18n.CUSTOM_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.CUSTOM_EMPTY_TITLE} />, []);

  return (
    <div data-test-subj="customTabContent">
      {showCustomCallout(partitionedFieldMetadata.custom) ? (
        <>
          <CustomCallout customFieldMetadata={partitionedFieldMetadata.custom} />

          <EuiSpacer />

          <CompareFieldsTable
            enrichedFieldMetadata={partitionedFieldMetadata.custom}
            getTableColumns={getCustomTableColumns}
            title={i18n.CUSTOM_FIELDS_TABLE_TITLE(indexName)}
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
