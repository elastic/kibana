/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../query_client';
import type { EmbeddableAlertsTableConfig } from '../types';
import { ConfigEditorContent } from './config_editor_content';

export interface ConfigEditorProps {
  coreServices: CoreStart;
  initialConfig?: EmbeddableAlertsTableConfig;
  onSave: (newConfig: EmbeddableAlertsTableConfig) => void;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

export const ConfigEditor = ({
  coreServices,
  initialConfig,
  onSave,
  closeFlyout,
  ariaLabelledBy,
}: ConfigEditorProps) => {
  const { overlays, http, notifications } = coreServices;

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigEditorContent
        ariaLabelledBy={ariaLabelledBy}
        initialConfig={initialConfig}
        onSave={(newConfig: EmbeddableAlertsTableConfig) => {
          onSave(newConfig);
          closeFlyout();
        }}
        onCancel={closeFlyout}
        services={{ http, notifications, overlays }}
      />
    </QueryClientProvider>
  );
};
