/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { KiDocument } from '../../../../../common/http_api/knowledge_indicators';
import { KiContentPanel, type KiContentPanelSaveFields } from './content/ki_content_panel';
import { ViewKiMetadataPanel } from './metadata/view_ki_metadata_panel';

interface KiContentLayoutProps {
  document?: KiDocument;
  kiId: string;
  isLoading?: boolean;
  isEditing?: boolean;
  onCancel?: () => void;
  isSaving?: boolean;
  onSave?: (fields: KiContentPanelSaveFields) => void;
}

export const KiContentLayout = ({
  document,
  kiId,
  isLoading = false,
  isEditing,
  onCancel,
  isSaving,
  onSave,
}: KiContentLayoutProps) => (
  <EuiFlexGroup
    gutterSize="xl"
    responsive
    alignItems="stretch"
    data-test-subj="contextViewKiContentLayout"
  >
    <EuiFlexItem grow={2} data-test-subj="contextViewKiMainColumn">
      <KiContentPanel
        document={document}
        isLoading={isLoading}
        isEditing={isEditing}
        onCancel={onCancel}
        isSaving={isSaving}
        onSave={onSave}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={1} data-test-subj="contextViewKiSidebarColumn">
      <ViewKiMetadataPanel kiId={kiId} document={document} isLoading={isLoading} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
