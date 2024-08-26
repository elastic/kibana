/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { IncompatibleCallout } from '../callouts/incompatible_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import { getIncompatibleMappingsTableColumns } from '../compare_fields_table/get_incompatible_mappings_table_columns';
import { getIncompatibleValuesTableColumns } from '../compare_fields_table/helpers';
import { EmptyPromptBody } from '../../../empty_prompt_body';
import { EmptyPromptTitle } from '../../../empty_prompt_title';
import {
  getAllIncompatibleMarkdownComments,
  getIncompatibleMappings,
  getIncompatibleValues,
  showInvalidCallout,
} from './helpers';
import * as i18n from '../../../translations';
import {
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE,
} from './translations';
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

const IncompatibleTabComponent: React.FC<Props> = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}) => {
  const body = useMemo(() => <EmptyPromptBody body={i18n.INCOMPATIBLE_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.INCOMPATIBLE_EMPTY_TITLE} />, []);
  const incompatibleMappings = useMemo(
    () => getIncompatibleMappings(partitionedFieldMetadata.incompatible),
    [partitionedFieldMetadata.incompatible]
  );
  const incompatibleValues = useMemo(
    () => getIncompatibleValues(partitionedFieldMetadata.incompatible),
    [partitionedFieldMetadata.incompatible]
  );

  const { isILMAvailable } = useDataQualityContext();

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
      {showInvalidCallout(partitionedFieldMetadata.incompatible) ? (
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
        <EuiEmptyPrompt
          body={body}
          iconType="check"
          iconColor="success"
          title={title}
          titleSize="s"
        />
      )}
    </div>
  );
};

IncompatibleTabComponent.displayName = 'IncompatibleTabComponent';

export const IncompatibleTab = React.memo(IncompatibleTabComponent);
