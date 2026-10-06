/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { getDocumentString, getMemorySessionId } from './ki_detail_helpers';
import { KiFormattedDate } from './ki_formatted_date';

const preWrapStyle = css`
  white-space: pre-wrap;
`;

interface KiDetailSummaryProps {
  document: KiDocument;
  showMemoryFields: boolean;
}

export const KiDetailSummary = ({ document, showMemoryFields }: KiDetailSummaryProps) => {
  const description = getDocumentString(document, 'description');
  const sessionId = getMemorySessionId(document);
  const expiresAt = getDocumentString(document, 'expires_at');

  const memoryListItems = useMemo(() => {
    if (!showMemoryFields) {
      return [];
    }
    const items: Array<{ title: string; description: React.ReactNode }> = [];
    if (sessionId) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.summary.sessionId', {
          defaultMessage: 'Session ID',
        }),
        description: sessionId,
      });
    }
    items.push({
      title: i18n.translate('xpack.contextEngine.kiDetail.summary.expiresAt', {
        defaultMessage: 'Expires',
      }),
      description: expiresAt ? (
        <KiFormattedDate value={expiresAt} />
      ) : (
        <FormattedMessage
          id="xpack.contextEngine.kiDetail.summary.expiresNever"
          defaultMessage="Never"
        />
      ),
    });
    return items;
  }, [expiresAt, sessionId, showMemoryFields]);

  const hasDescription = description.length > 0;
  const hasMemoryList = memoryListItems.length > 0;

  if (!hasDescription && !hasMemoryList) {
    return null;
  }

  return (
    <>
      {hasDescription ? (
        <EuiText size="m" color="subdued" data-test-subj="contextKiDetailDescription">
          <p css={preWrapStyle}>{description}</p>
        </EuiText>
      ) : null}
      {hasMemoryList ? (
        <>
          {hasDescription ? <EuiSpacer size="m" /> : null}
          <EuiDescriptionList
            compressed
            listItems={memoryListItems}
            data-test-subj="contextKiDetailMemoryFields"
          />
        </>
      ) : null}
      <EuiSpacer size="m" />
    </>
  );
};
