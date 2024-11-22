/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { Actions } from '../../../../../actions';
import { getAllIncompatibleMarkdownComments } from '../../../../../utils/markdown';
import { IncompatibleCallout } from '../incompatible_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import {
  getIncompatibleMappingsTableColumns,
  getIncompatibleValuesTableColumns,
} from './utils/get_incompatible_table_columns';
import type { IlmPhase, IncompatibleFieldMetadata } from '../../../../../types';
import { useDataQualityContext } from '../../../../../data_quality_context';
import { StickyActions } from '../latest_results/latest_check_fields/sticky_actions';
import {
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE,
} from '../../../../../translations';
import { CheckSuccessEmptyPrompt } from '../check_success_empty_prompt';

interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  patternDocsCount?: number;
  sizeInBytes: number | undefined;
  incompatibleMappingsFields: IncompatibleFieldMetadata[];
  incompatibleValuesFields: IncompatibleFieldMetadata[];
  sameFamilyFieldsCount: number;
  ecsCompliantFieldsCount: number;
  customFieldsCount: number;
  allFieldsCount: number;
  hasStickyActions?: boolean;
}

const IncompatibleTabComponent: React.FC<Props> = ({
  docsCount,
  ilmPhase,
  indexName,
  patternDocsCount,
  sizeInBytes,
  incompatibleMappingsFields,
  incompatibleValuesFields,
  sameFamilyFieldsCount,
  ecsCompliantFieldsCount,
  customFieldsCount,
  allFieldsCount,
  hasStickyActions = true,
}) => {
  const { isILMAvailable, formatBytes, formatNumber } = useDataQualityContext();

  const incompatibleFieldCount =
    incompatibleMappingsFields.length + incompatibleValuesFields.length;

  const markdownComment: string = useMemo(
    () =>
      getAllIncompatibleMarkdownComments({
        docsCount,
        formatBytes,
        formatNumber,
        ilmPhase,
        indexName,
        isILMAvailable,
        incompatibleMappingsFields,
        incompatibleValuesFields,
        sameFamilyFieldsCount,
        ecsCompliantFieldsCount,
        customFieldsCount,
        allFieldsCount,
        patternDocsCount,
        sizeInBytes,
      }).join('\n'),
    [
      allFieldsCount,
      customFieldsCount,
      docsCount,
      ecsCompliantFieldsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      incompatibleMappingsFields,
      incompatibleValuesFields,
      indexName,
      isILMAvailable,
      patternDocsCount,
      sameFamilyFieldsCount,
      sizeInBytes,
    ]
  );

  return (
    <div data-test-subj="incompatibleTabContent">
      {incompatibleFieldCount > 0 ? (
        <>
          <IncompatibleCallout />

          <>
            {incompatibleMappingsFields.length > 0 && (
              <>
                <EuiSpacer />

                <CompareFieldsTable
                  enrichedFieldMetadata={incompatibleMappingsFields}
                  getTableColumns={getIncompatibleMappingsTableColumns}
                  title={INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName)}
                />
              </>
            )}
          </>

          <>
            {incompatibleValuesFields.length > 0 && (
              <>
                <EuiSpacer />

                <CompareFieldsTable
                  enrichedFieldMetadata={incompatibleValuesFields}
                  getTableColumns={getIncompatibleValuesTableColumns}
                  title={INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE(indexName)}
                />
              </>
            )}
          </>

          <EuiSpacer size="m" />
          {hasStickyActions ? (
            <StickyActions
              markdownComment={markdownComment}
              indexName={indexName}
              showChatAction={true}
              showCopyToClipboardAction={true}
              showAddToNewCaseAction={true}
            />
          ) : (
            <Actions
              markdownComment={markdownComment}
              indexName={indexName}
              showChatAction={true}
              showCopyToClipboardAction={true}
              showAddToNewCaseAction={true}
            />
          )}
        </>
      ) : (
        <CheckSuccessEmptyPrompt />
      )}
    </div>
  );
};

IncompatibleTabComponent.displayName = 'IncompatibleTabComponent';

export const IncompatibleTab = React.memo(IncompatibleTabComponent);
