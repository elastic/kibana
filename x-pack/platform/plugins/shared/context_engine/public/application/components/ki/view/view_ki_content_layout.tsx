/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { KiDocument } from '../../../../../common/http_api/knowledge_indicators';
import {
  ViewKiContentPanel,
  type ViewKiContentPanelSaveFields,
} from './content/view_ki_content_panel';
import { ViewKiMetadataPanel } from './metadata/view_ki_metadata_panel';

interface ViewKiContentLayoutProps {
  document?: KiDocument;
  kiId: string;
  isLoading?: boolean;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  isSaving?: boolean;
  onSave?: (fields: ViewKiContentPanelSaveFields) => void;
}

export const ViewKiContentLayout = ({
  document,
  kiId,
  isLoading = false,
  isEditing,
  onEditingChange,
  isSaving,
  onSave,
}: ViewKiContentLayoutProps) => (
  <EuiFlexGroup
    gutterSize="xl"
    responsive
    alignItems="stretch"
    data-test-subj="contextViewKiContentLayout"
  >
    <EuiFlexItem grow={2} data-test-subj="contextViewKiMainColumn">
      <ViewKiContentPanel
        document={document}
        isLoading={isLoading}
        isEditing={isEditing}
        onEditingChange={onEditingChange}
        isSaving={isSaving}
        onSave={onSave}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={1} data-test-subj="contextViewKiSidebarColumn">
      <ViewKiMetadataPanel kiId={kiId} document={document} isLoading={isLoading} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
