/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { openLazyFlyout } from '@kbn/presentation-util';
import { getServices } from '../services';
import type { VectorProjectionConfig } from '../types';

interface OpenEditorFlyoutParams {
  parentApi: unknown;
  initialConfig?: VectorProjectionConfig;
  isNewPanel: boolean;
  focusedPanelId?: string;
  returnFocus?: () => void;
  onSave: (config: VectorProjectionConfig) => void;
}

export const openEditorFlyout = ({
  parentApi,
  initialConfig,
  isNewPanel,
  focusedPanelId,
  returnFocus,
  onSave,
}: OpenEditorFlyoutParams) => {
  const services = getServices();
  const { core } = services;
  openLazyFlyout({
    core,
    parentApi,
    returnFocus,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const { VectorProjectionEditor } = await import('./vector_projection_editor');
      return (
        <VectorProjectionEditor
          services={services}
          initialConfig={initialConfig}
          isNewPanel={isNewPanel}
          ariaLabelledBy={ariaLabelledBy}
          onCancel={closeFlyout}
          onSave={(config) => {
            onSave(config);
            closeFlyout();
          }}
        />
      );
    },
    flyoutProps: { focusedPanelId, size: 's' },
  });
};
