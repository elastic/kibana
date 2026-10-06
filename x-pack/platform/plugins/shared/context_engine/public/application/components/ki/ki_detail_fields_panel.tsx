/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { getFlattenedKeyValuePairs, KeyValueTable } from '@kbn/key-value-metadata-table';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { GetKiResponse } from '../../../../common/http_api/knowledge_indicators';
import { buildKiDetailDocumentView } from './ki_detail_document_view';

interface KiDetailFieldsPanelProps {
  ki: GetKiResponse;
}

export const KiDetailFieldsPanel = ({ ki }: KiDetailFieldsPanelProps) => {
  const keyValuePairs = useMemo(() => {
    const documentView = buildKiDetailDocumentView(ki);
    return getFlattenedKeyValuePairs(documentView);
  }, [ki]);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextKiDetailFieldsPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.fields.title"
            defaultMessage="Fields"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {keyValuePairs.length === 0 ? (
        <EuiEmptyPrompt
          iconType="document"
          title={
            <h3>
              <FormattedMessage
                id="xpack.contextEngine.kiDetail.fields.emptyTitle"
                defaultMessage="No fields"
              />
            </h3>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.contextEngine.kiDetail.fields.emptyBody"
                defaultMessage="This Knowledge Indicator has no document fields to display."
              />
            </p>
          }
          data-test-subj="contextKiDetailFieldsEmpty"
        />
      ) : (
        <KeyValueTable keyValuePairs={keyValuePairs} />
      )}
    </EuiPanel>
  );
};
