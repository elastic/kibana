/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import React from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { KiDetailAttributesSection } from './ki_detail_attributes_panel';
import { documentAttributesToRows } from './ki_detail_helpers';
import { KiDetailMetadataSection } from './ki_detail_metadata_panel';

const hasKiDetailAttributes = (document: KiDocument): boolean =>
  documentAttributesToRows(document).some(
    (row) => row.key.trim().length > 0 && row.value.trim().length > 0
  );

interface KiDetailDetailsPanelProps {
  kiId: string;
  document: KiDocument;
}

export const KiDetailDetailsPanel = ({ kiId, document }: KiDetailDetailsPanelProps) => {
  const showAttributes = hasKiDetailAttributes(document);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextKiDetailDetailsPanel">
      <KiDetailMetadataSection kiId={kiId} document={document} />
      {showAttributes ? (
        <>
          <EuiHorizontalRule margin="m" />
          <KiDetailAttributesSection document={document} />
        </>
      ) : null}
    </EuiPanel>
  );
};
