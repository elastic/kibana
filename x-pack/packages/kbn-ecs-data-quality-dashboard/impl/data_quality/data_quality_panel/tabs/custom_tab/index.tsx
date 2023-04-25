/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  copyToClipboard,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useMemo } from 'react';

import { CustomCallout } from '../callouts/custom_callout';
import { CompareFieldsTable } from '../../../compare_fields_table';
import { getCustomTableColumns } from '../../../compare_fields_table/helpers';
import { EMPTY_STAT } from '../../../helpers';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import { getAllCustomMarkdownComments, showCustomCallout } from './helpers';
import * as i18n from '../../index_properties/translations';
import { COPIED_RESULTS_TOAST_TITLE } from '../../../translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../types';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  defaultNumberFormat: string;
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
}

const CustomTabComponent: React.FC<Props> = ({
  addSuccessToast,
  defaultNumberFormat,
  docsCount,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
}) => {
  const formatNumber = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT,
    [defaultNumberFormat]
  );
  const markdownComments: string[] = useMemo(
    () =>
      getAllCustomMarkdownComments({
        docsCount,
        formatNumber,
        ilmPhase,
        indexName,
        partitionedFieldMetadata,
        patternDocsCount,
      }),
    [docsCount, formatNumber, ilmPhase, indexName, partitionedFieldMetadata, patternDocsCount]
  );

  const body = useMemo(() => <EmptyPromptBody body={i18n.CUSTOM_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.CUSTOM_EMPTY_TITLE} />, []);

  const onCopy = useCallback(() => {
    copyToClipboard(markdownComments.join('\n'));

    addSuccessToast({
      title: COPIED_RESULTS_TOAST_TITLE,
    });
  }, [addSuccessToast, markdownComments]);

  return (
    <>
      {showCustomCallout(partitionedFieldMetadata.custom) ? (
        <>
          <CustomCallout enrichedFieldMetadata={partitionedFieldMetadata.custom}>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty aria-label={i18n.COPY_TO_CLIPBOARD} flush="both" onClick={onCopy}>
                  {i18n.COPY_TO_CLIPBOARD}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </CustomCallout>

          <EuiSpacer />

          <CompareFieldsTable
            enrichedFieldMetadata={partitionedFieldMetadata.custom}
            getTableColumns={getCustomTableColumns}
            title={i18n.CUSTOM_FIELDS_TABLE_TITLE(indexName)}
          />
        </>
      ) : (
        <EuiEmptyPrompt body={body} title={title} titleSize="s" />
      )}
    </>
  );
};

CustomTabComponent.displayName = 'CustomTabComponent';

export const CustomTab = React.memo(CustomTabComponent);
