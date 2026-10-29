/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { viewKiLoadingPanelCss } from '../view_ki_constants';
import { EditKiContentPanel, type EditKiContentPanelSaveFields } from './edit_ki_content_panel';
import { ViewKiContentPanel } from './view_ki_content_panel';

export type KiContentPanelSaveFields = EditKiContentPanelSaveFields;

interface KiContentPanelProps {
  document?: KiDocument;
  isLoading?: boolean;
  isEditing?: boolean;
  onCancel?: () => void;
  isSaving?: boolean;
  onSave?: (fields: KiContentPanelSaveFields) => void;
}

export const KiContentPanel = ({
  document,
  isLoading = false,
  isEditing = false,
  onCancel,
  isSaving = false,
  onSave,
}: KiContentPanelProps) => {
  const content = document?.content ?? '';

  if (isLoading) {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        data-test-subj="contextViewKiContentPanel"
      >
        <EuiPanel
          hasBorder
          paddingSize="l"
          css={viewKiLoadingPanelCss}
          data-test-subj="contextViewKiContentLoading"
        >
          <EuiSkeletonText lines={3} />
        </EuiPanel>
      </EuiFlexGroup>
    );
  }

  if (isEditing) {
    return (
      <EditKiContentPanel
        content={content}
        isSaving={isSaving}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
  }

  return <ViewKiContentPanel content={content} />;
};
