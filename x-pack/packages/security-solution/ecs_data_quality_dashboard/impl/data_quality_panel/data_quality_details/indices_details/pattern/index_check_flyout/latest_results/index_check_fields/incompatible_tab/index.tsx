/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import {
  getAllIncompatibleMarkdownComments,
  getIncompatibleMappings,
  getIncompatibleValues,
} from '../../../../../../../utils/markdown';
import { IncompatibleCallout } from '../../../incompatible_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import {
  getIncompatibleMappingsTableColumns,
  getIncompatibleValuesTableColumns,
} from './utils/get_incompatible_table_columns';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../../../../../types';
import { useDataQualityContext } from '../../../../../../../data_quality_context';
import { StickyActions } from '../sticky_actions';
import {
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE,
} from '../../../../../../../translations';
import { CheckSuccessEmptyPrompt } from '../../../check_success_empty_prompt';

interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}

const IncompatibleTabComponent: React.FC<Props> = ({
  docsCount,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}) => {
  const incompatibleMappings = useMemo(
    () => getIncompatibleMappings(partitionedFieldMetadata.incompatible),
    [partitionedFieldMetadata.incompatible]
  );
  const incompatibleValues = useMemo(
    () => getIncompatibleValues(partitionedFieldMetadata.incompatible),
    [partitionedFieldMetadata.incompatible]
  );

  const { isILMAvailable, formatBytes, formatNumber } = useDataQualityContext();

  const markdownComment: string = useMemo(
    () =>
      getAllIncompatibleMarkdownComments({
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

  return (
    <div data-test-subj="incompatibleTabContent">
      {partitionedFieldMetadata.incompatible.length > 0 ? (
        <>
          <IncompatibleCallout />

          <>
            {incompatibleMappings.length > 0 && (
              <>
                <EuiSpacer />

                <CompareFieldsTable
                  enrichedFieldMetadata={incompatibleMappings}
                  getTableColumns={getIncompatibleMappingsTableColumns}
                  title={INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName)}
                />
              </>
            )}
          </>

          <>
            {incompatibleValues.length > 0 && (
              <>
                <EuiSpacer />

                <CompareFieldsTable
                  enrichedFieldMetadata={incompatibleValues}
                  getTableColumns={getIncompatibleValuesTableColumns}
                  title={INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE(indexName)}
                />
              </>
            )}
          </>

          <EuiSpacer size="m" />
          <StickyActions
            markdownComment={markdownComment}
            indexName={indexName}
            showChatAction={true}
            showCopyToClipboardAction={true}
            showAddToNewCaseAction={true}
          />
        </>
      ) : (
        <CheckSuccessEmptyPrompt />
      )}
    </div>
  );
};

IncompatibleTabComponent.displayName = 'IncompatibleTabComponent';

export const IncompatibleTab = React.memo(IncompatibleTabComponent);
