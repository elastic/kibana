/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { SameFamilyCallout } from '../callouts/same_family_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import { getIncompatibleMappingsTableColumns } from '../compare_fields_table/get_incompatible_mappings_table_columns';
import { useDataQualityContext } from '../../../../../../../../data_quality_context';
import { getAllSameFamilyMarkdownComments, getSameFamilyMappings } from './helpers';
import { SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE } from './translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../../../../../../types';
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

const SameFamilyTabComponent: React.FC<Props> = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}) => {
  const sameFamilyMappings = useMemo(
    () => getSameFamilyMappings(partitionedFieldMetadata.sameFamily),
    [partitionedFieldMetadata.sameFamily]
  );

  const { isILMAvailable } = useDataQualityContext();
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
      <SameFamilyCallout ecsBasedFieldMetadata={partitionedFieldMetadata.sameFamily} />

      <>
        {sameFamilyMappings.length > 0 && (
          <>
            <EuiSpacer />

            <CompareFieldsTable
              enrichedFieldMetadata={sameFamilyMappings}
              getTableColumns={getIncompatibleMappingsTableColumns}
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
