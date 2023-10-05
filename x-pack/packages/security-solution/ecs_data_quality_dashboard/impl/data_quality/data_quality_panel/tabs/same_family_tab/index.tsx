/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { SameFamilyCallout } from '../callouts/same_family_callout';
import { CompareFieldsTable } from '../../../compare_fields_table';
import { getIncompatibleMappingsTableColumns } from '../../../compare_fields_table/get_incompatible_mappings_table_columns';
import { useDataQualityContext } from '../../data_quality_context';
import { getAllSameFamilyMarkdownComments, getSameFamilyMappings } from './helpers';
import * as i18n from '../../index_properties/translations';
import { SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE } from './translations';
import { COPIED_RESULTS_TOAST_TITLE } from '../../../translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../types';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
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
  addSuccessToast,
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
  const markdownComments: string[] = useMemo(
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
      }),
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

  const onCopy = useCallback(() => {
    copyToClipboard(markdownComments.join('\n'));

    addSuccessToast({
      title: COPIED_RESULTS_TOAST_TITLE,
    });
  }, [addSuccessToast, markdownComments]);

  return (
    <div data-test-subj="sameFamilyTab">
      <SameFamilyCallout enrichedFieldMetadata={partitionedFieldMetadata.sameFamily}>
        <EuiButtonEmpty aria-label={i18n.COPY_TO_CLIPBOARD} flush="both" onClick={onCopy}>
          {i18n.COPY_TO_CLIPBOARD}
        </EuiButtonEmpty>
      </SameFamilyCallout>

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
    </div>
  );
};

SameFamilyTabComponent.displayName = 'SameFamilyTabComponent';

export const SameFamilyTab = React.memo(SameFamilyTabComponent);
