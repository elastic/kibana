/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import React from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { useLensInput } from './use_lens_input';
import { BaseVisualization } from '../shared/base_visualization';

export function VisualizeLens({
  lens,
  dataViews,
  uiActions,
  lensConfig,
  onPromoteToAttachment,
  findExistingVisualizationAttachment,
  onOpenAttachment,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  uiActions: UiActionsStart;
  lensConfig: any;
  /** Optional callback to promote visualization to attachment */
  onPromoteToAttachment?: (lensConfig: any) => void;
  /** Function to find if a visualization is already an attachment */
  findExistingVisualizationAttachment?: (lensConfig: any) => { id: string } | undefined;
  /** Callback to open an existing attachment in the viewer */
  onOpenAttachment?: (attachmentId: string) => void;
}) {
  const { lensInput, setLensInput, isLoading, error } = useLensInput({
    lens,
    dataViews,
    lensConfig,
  });

  // Check if this visualization is already an attachment
  const existingAttachment = findExistingVisualizationAttachment?.(lensConfig);

  // Show error state if there's an error
  if (error) {
    return (
      <>
        <EuiCallOut title="Visualization Error" color="danger" iconType="error" size="s">
          <p>{error.message}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  }

  return (
    <BaseVisualization
      lens={lens}
      uiActions={uiActions}
      lensInput={lensInput}
      setLensInput={setLensInput}
      isLoading={isLoading}
      onPromoteToAttachment={
        // Pass the original lensConfig (API format), not lensInput.attributes (Lens format)
        // The attachment renderer will convert it back via LensConfigBuilder.fromAPIFormat()
        onPromoteToAttachment ? () => onPromoteToAttachment(lensConfig) : undefined
      }
      existingAttachmentId={existingAttachment?.id}
      onOpenAttachment={onOpenAttachment}
    />
  );
}
