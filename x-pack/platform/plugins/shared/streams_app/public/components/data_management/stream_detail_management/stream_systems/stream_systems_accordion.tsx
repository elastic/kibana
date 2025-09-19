/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useStreamSystems } from './hooks/use_stream_systems';
import { StreamExistingSystemsTable } from './stream_existing_systems_table';

export const StreamSystemsAccordion = ({
  definition,
}: {
  definition: Streams.ClassicStream.GetResponse;
}) => {
  const { systems, refresh, loading } = useStreamSystems(definition);

  return (
    <EuiAccordion
      id="steam-systems-accordion"
      buttonContent={i18n.translate('xpack.streams.streamSystemsAccordion.buttonLabel', {
        defaultMessage: 'Stream systems',
      })}
    >
      <StreamExistingSystemsTable
        isLoading={loading}
        systems={systems}
        definition={definition}
        refreshSystems={refresh}
      />
    </EuiAccordion>
  );
};
