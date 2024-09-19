/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { SameFamilyCallout } from '../../../same_family_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import { useDataQualityContext } from '../../../../../../../data_quality_context';
import { getAllSameFamilyMarkdownComments } from './utils/markdown';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../../../../../types';
import { StickyActions } from '../sticky_actions';
import { getSameFamilyTableColumns } from './utils/get_same_family_table_columns';
import { SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE } from '../../../translations';

interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}

const SameFamilyTabComponent: React.FC<Props> = ({
  docsCount,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}) => {
  const sameFamilyMappings = partitionedFieldMetadata.sameFamily;

  const { isILMAvailable, formatBytes, formatNumber } = useDataQualityContext();
  const markdownComment: string = useMemo(
    () =>
      getAllSameFamilyMarkdownComments({
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
    <div data-test-subj="sameFamilyTabContent">
      <SameFamilyCallout fieldCount={partitionedFieldMetadata.sameFamily.length} />

      <>
        {sameFamilyMappings.length > 0 && (
          <>
            <EuiSpacer />

            <CompareFieldsTable
              enrichedFieldMetadata={sameFamilyMappings}
              getTableColumns={getSameFamilyTableColumns}
              title={SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE(indexName)}
            />
          </>
        )}
      </>

      <EuiSpacer size={sameFamilyMappings.length > 0 ? 'm' : 'l'} />
      <StickyActions markdownComment={markdownComment} showCopyToClipboardAction={true} />
    </div>
  );
};

SameFamilyTabComponent.displayName = 'SameFamilyTabComponent';

export const SameFamilyTab = React.memo(SameFamilyTabComponent);
