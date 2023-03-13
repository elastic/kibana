/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  copyToClipboard,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useMemo } from 'react';

import { IncompatibleCallout } from '../callouts/incompatible_callout';
import { CompareFieldsTable } from '../../../compare_fields_table';
import { getIncompatibleMappingsTableColumns } from '../../../compare_fields_table/get_incompatible_mappings_table_columns';
import { getIncompatibleValuesTableColumns } from '../../../compare_fields_table/helpers';
import { EMPTY_STAT } from '../../../helpers';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import {
  getAllIncompatibleMarkdownComments,
  getIncompatibleMappings,
  getIncompatibleValues,
  showInvalidCallout,
} from './helpers';
import * as i18n from '../../index_properties/translations';
import { CopyToClipboardButton } from '../styles';
import {
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE,
} from './translations';
import { COPIED_RESULTS_TOAST_TITLE } from '../../../translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../types';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  addToNewCaseDisabled: boolean;
  defaultNumberFormat: string;
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
}

const IncompatibleTabComponent: React.FC<Props> = ({
  addSuccessToast,
  addToNewCaseDisabled,
  defaultNumberFormat,
  docsCount,
  ilmPhase,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
  patternDocsCount,
}) => {
  const formatNumber = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT,
    [defaultNumberFormat]
  );
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
  const markdownComments: string[] = useMemo(
    () =>
      getAllIncompatibleMarkdownComments({
        docsCount,
        formatNumber,
        ilmPhase,
        indexName,
        partitionedFieldMetadata,
        patternDocsCount,
      }),
    [docsCount, formatNumber, ilmPhase, indexName, partitionedFieldMetadata, patternDocsCount]
  );
  const onClickAddToCase = useCallback(
    () => onAddToNewCase([markdownComments.join('\n')]),
    [markdownComments, onAddToNewCase]
  );
  const onCopy = useCallback(() => {
    copyToClipboard(markdownComments.join('\n'));

    addSuccessToast({
      title: COPIED_RESULTS_TOAST_TITLE,
    });
  }, [addSuccessToast, markdownComments]);

  return (
    <>
      {showInvalidCallout(partitionedFieldMetadata.incompatible) ? (
        <>
          <IncompatibleCallout enrichedFieldMetadata={partitionedFieldMetadata.incompatible}>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiButton
                  aria-label={i18n.ADD_TO_NEW_CASE}
                  disabled={addToNewCaseDisabled}
                  onClick={onClickAddToCase}
                >
                  {i18n.ADD_TO_NEW_CASE}
                </EuiButton>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <CopyToClipboardButton aria-label={i18n.COPY_TO_CLIPBOARD} onClick={onCopy}>
                  {i18n.COPY_TO_CLIPBOARD}
                </CopyToClipboardButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </IncompatibleCallout>

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
    </>
  );
};

IncompatibleTabComponent.displayName = 'IncompatibleTabComponent';

export const IncompatibleTab = React.memo(IncompatibleTabComponent);
