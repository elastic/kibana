/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { QueryClientProvider } from '@kbn/react-query';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { queryClient } from '../query_client';
import type { EmbeddableAlertsTableConfig } from '../types';
import { ConfigEditorContent } from './config_editor_content';

export interface ConfigEditorProps {
  coreServices: CoreStart;
  initialConfig?: EmbeddableAlertsTableConfig;
  onSave: (newConfig: EmbeddableAlertsTableConfig) => void;
  closeFlyout: () => void;
  ariaLabelledBy: string;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
}

export const ConfigEditor = ({
  coreServices,
  initialConfig,
  onSave,
  closeFlyout,
  ariaLabelledBy,
  unifiedSearch,
  data,
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
        services={{ http, notifications, overlays, unifiedSearch, data }}
      />
    </QueryClientProvider>
  );
};
