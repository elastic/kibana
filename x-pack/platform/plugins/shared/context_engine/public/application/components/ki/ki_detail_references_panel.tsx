/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import {
  documentReferencesToRows,
  getKiReferenceRelationLabel,
  isHttpUri,
} from './ki_detail_helpers';

interface KiDetailReferencesPanelProps {
  document: KiDocument;
}

export const KiDetailReferencesPanel = ({ document }: KiDetailReferencesPanelProps) => {
  const viewReferences = useMemo(() => documentReferencesToRows(document), [document]);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextKiDetailReferencesPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.references.title"
            defaultMessage="References"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {viewReferences.length > 0 ? (
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="contextKiDetailReferencesList"
        >
          {viewReferences.map((row, index) => (
            <EuiPanel key={`${row.uri}-${index}`} paddingSize="s" hasBorder>
              <EuiText size="s">
                {isHttpUri(row.uri) ? (
                  <EuiLink href={row.uri} target="_blank" external>
                    {row.uri}
                  </EuiLink>
                ) : (
                  <code>{row.uri}</code>
                )}
              </EuiText>
              {row.relation !== '' && (
                <EuiBadge color="hollow">{getKiReferenceRelationLabel(row.relation)}</EuiBadge>
              )}
              {row.description.length > 0 && (
                <EuiText size="s" color="subdued">
                  <p>{row.description}</p>
                </EuiText>
              )}
            </EuiPanel>
          ))}
        </EuiFlexGroup>
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="contextKiDetailReferencesEmpty">
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.references.empty"
            defaultMessage="No references"
          />
        </EuiText>
      )}
    </EuiPanel>
  );
};
