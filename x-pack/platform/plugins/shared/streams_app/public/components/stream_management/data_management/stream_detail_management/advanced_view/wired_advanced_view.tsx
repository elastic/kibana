/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { usePerformanceContext } from '@kbn/ebt-tools';
import type { Streams } from '@kbn/streams-schema';
import { isRoot, LOGS_ROOT_STREAM_NAME } from '@kbn/streams-schema';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
import { IndexConfiguration } from './index_configuration';
import { DeleteStreamPanel } from './delete_stream';
import { ImportExportPanel } from './import_export';
import { useStreamsPrivileges } from '../../../../../hooks/use_streams_privileges';
import { DraftMaterializationCTA } from '../../draft_materialization_cta';

export function WiredAdvancedView({
  definition,
  refreshDefinition,
  isDraft = false,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
  isDraft?: boolean;
}) {
  const {
    features: { contentPacks, significantEvents },
  } = useStreamsPrivileges();

  const { onPageReady } = usePerformanceContext();

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (definition && !contentPacks?.enabled && !significantEvents?.enabled) {
      const streamType = getStreamTypeFromDefinition(definition.stream);
      onPageReady({
        meta: {
          description: `[ttfmp_streams_detail_advanced] streamType: ${streamType}`,
        },
      });
    }
  }, [definition, contentPacks?.enabled, significantEvents?.enabled, onPageReady]);

  return (
    <>
      {isDraft && (
        <>
          <DraftMaterializationCTA definition={definition} refreshDefinition={refreshDefinition} />
          <EuiSpacer />
        </>
      )}
      {contentPacks.enabled && (
        <>
          <ImportExportPanel definition={definition} refreshDefinition={refreshDefinition} />
          <EuiSpacer />
        </>
      )}
      {!isDraft && (
        <IndexConfiguration definition={definition} refreshDefinition={refreshDefinition}>
          <EuiCallOut
            announceOnMount={false}
            iconType="warning"
            color="primary"
            title={i18n.translate(
              'xpack.streams.streamDetailView.indexConfiguration.inheritSettingsTitle',
              {
                defaultMessage:
                  'Changes will be inherited by child streams unless they override them explicitly.',
              }
            )}
          />
          <EuiSpacer size="l" />
        </IndexConfiguration>
      )}
      {(!isRoot(definition.stream.name) || definition.stream.name === LOGS_ROOT_STREAM_NAME) && (
        <>
          <EuiSpacer />
          <DeleteStreamPanel definition={definition} />
        </>
      )}
      <EuiSpacer />
    </>
  );
}
