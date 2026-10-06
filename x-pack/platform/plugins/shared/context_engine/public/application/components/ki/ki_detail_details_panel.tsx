/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { KiDetailAttributesSection } from './ki_detail_attributes_panel';
import { KiDetailMetadataSection } from './ki_detail_metadata_panel';
import { KiDetailReferencesSection } from './ki_detail_references_panel';

interface KiDetailDetailsPanelProps {
  kiId: string;
  document: KiDocument;
}

export const KiDetailDetailsPanel = ({ kiId, document }: KiDetailDetailsPanelProps) => {
  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={css`
        flex: 1 1 auto;
        min-height: 0;
        height: 100%;
      `}
      data-test-subj="contextKiDetailDetailsPanel"
    >
      <KiDetailMetadataSection kiId={kiId} document={document} />
      <EuiHorizontalRule margin="m" />
      <KiDetailAttributesSection document={document} />
      <EuiHorizontalRule margin="m" />
      <KiDetailReferencesSection document={document} />
    </EuiPanel>
  );
};
