/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion } from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { StreamExistingSystemsTable } from './stream_existing_systems_table';

export const StreamSystemsAccordion = ({
  definition,
  systems,
  loading,
  refresh,
}: {
  definition: Streams.all.Definition;
  systems: System[];
  loading: boolean;
  refresh: () => void;
}) => {
  return (
    <EuiAccordion
      initialIsOpen={true}
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
