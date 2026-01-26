/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { EuiSpacer } from '@elastic/eui';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { DeleteStreamPanel } from '../data_management/stream_detail_management/advanced_view/delete_stream';
import { ImportExportPanel } from '../data_management/stream_detail_management/advanced_view/import_export';
import { StreamDescription } from '../stream_detail_systems/stream_description';
import { StreamSystemConfiguration } from '../stream_detail_systems/stream_system_configuration';
import { useAIFeatures } from '../../hooks/use_ai_features';

export function QueryStreamsAdvancedView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.QueryStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    features: { contentPacks, significantEvents },
  } = useStreamsPrivileges();

  const aiFeatures = useAIFeatures();

  return (
    <>
      {contentPacks?.enabled && (
        <>
          <ImportExportPanel definition={definition} refreshDefinition={refreshDefinition} />
          <EuiSpacer />
        </>
      )}

      {significantEvents?.available && (
        <>
          <StreamDescription definition={definition} refreshDefinition={refreshDefinition} aiFeatures={aiFeatures} />
          <EuiSpacer />
          <StreamSystemConfiguration definition={definition.stream} aiFeatures={aiFeatures}   />
        </>
      )}
      <EuiSpacer />
      <DeleteStreamPanel definition={definition} />
      <EuiSpacer />
    </>
  );
}
