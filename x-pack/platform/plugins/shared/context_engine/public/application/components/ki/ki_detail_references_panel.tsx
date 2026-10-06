/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import {
  documentReferencesToRows,
  getKiReferenceRelationLabel,
  isHttpUri,
} from './ki_detail_helpers';
import { KiDetailSidebarSectionTitle, kiDetailSidebarBreakWordStyle } from './ki_detail_sidebar';

interface KiDetailReferencesPanelProps {
  document: KiDocument;
}

export const KiDetailReferencesSection = ({ document }: KiDetailReferencesPanelProps) => {
  const viewReferences = useMemo(() => documentReferencesToRows(document), [document]);

  return (
    <section data-test-subj="contextKiDetailReferencesPanel">
      <KiDetailSidebarSectionTitle>
        <FormattedMessage
          id="xpack.contextEngine.kiDetail.references.title"
          defaultMessage="References"
        />
      </KiDetailSidebarSectionTitle>
      <EuiSpacer size="s" />
      {viewReferences.length > 0 ? (
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          data-test-subj="contextKiDetailReferencesList"
        >
          {viewReferences.map((row, index) => (
            <div key={`${row.uri}-${index}`}>
              <EuiText size="s" css={kiDetailSidebarBreakWordStyle}>
                {isHttpUri(row.uri) ? (
                  <EuiLink href={row.uri} target="_blank" external>
                    {row.uri}
                  </EuiLink>
                ) : (
                  <code>{row.uri}</code>
                )}
              </EuiText>
              {row.relation !== '' && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiBadge color="hollow">{getKiReferenceRelationLabel(row.relation)}</EuiBadge>
                </>
              )}
              {row.description.length > 0 && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued" css={kiDetailSidebarBreakWordStyle}>
                    <p>{row.description}</p>
                  </EuiText>
                </>
              )}
            </div>
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
    </section>
  );
};
