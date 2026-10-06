/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { getDocumentString } from './ki_detail_helpers';
import { KiDetailMarkdownReadOnly } from './ki_detail_markdown_read_only';

const panelFillStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minHeight: 0,
};

interface KiDetailContentPanelProps {
  document: KiDocument;
}

export const KiDetailContentPanel = ({ document }: KiDetailContentPanelProps) => {
  const contentValue = getDocumentString(document, 'content');
  const hasContent = contentValue.length > 0;

  return (
    <div style={panelFillStyle} data-test-subj="contextKiDetailContentPanel">
      {hasContent ? (
        <KiDetailMarkdownReadOnly content={contentValue} />
      ) : (
        <EuiPanel
          hasBorder
          paddingSize="l"
          style={{
            ...panelFillStyle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiText size="s" color="subdued" data-test-subj="contextKiDetailContentEmpty">
            <FormattedMessage
              id="xpack.contextEngine.kiDetail.content.empty"
              defaultMessage="No content"
            />
          </EuiText>
        </EuiPanel>
      )}
    </div>
  );
};
