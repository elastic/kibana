/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { type DocCountResult, type docCountApi, RequestResultType } from './get_doc_count';
interface DocCountCellProps {
  indexName: string;
  docCountApi: ReturnType<typeof docCountApi>;
}

export const DocCountCell = ({ indexName, docCountApi }: DocCountCellProps) => {
  const docCountResponse = useObservable<Record<string, DocCountResult>>(
    docCountApi.getObservable()
  );
  const result = docCountResponse ? docCountResponse[indexName] : undefined;

  useEffect(() => {
    docCountApi.getByName(indexName);
  }, [docCountApi, indexName]);

  if (result === undefined) {
    return <EuiLoadingSpinner size="m" data-test-subj="docCountLoadingSpinner" />;
  }

  if (result.status === RequestResultType.Error) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.idxMgmt.indexTable.docCountErrorTooltip', {
          defaultMessage: 'Error loading document count',
        })}
      >
        <EuiText size="s" color="danger" tabIndex={0}>
          {i18n.translate('xpack.idxMgmt.indexTable.docCountErrorLabel', {
            defaultMessage: 'Error',
          })}
        </EuiText>
      </EuiToolTip>
    );
  }

  return Number(result.count).toLocaleString();
};
