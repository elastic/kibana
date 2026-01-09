/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import React, { useState } from 'react';
import { RUN_STREAM_DISCOVERY_BUTTON_LABEL } from './translations';
import { StreamsTreeTable } from './tree_table';
import { useDiscoveryStreams } from './use_discovery_streams_fetch';

export function StreamsTree() {
  const streamsListFetch = useDiscoveryStreams();
  const [selectedStreams, setSelectedStreams] = useState<ListStreamDetail[]>([]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiText size="s">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.streamsTree.streamsCountLabel',
              {
                defaultMessage: '{count} streams',
                values: { count: streamsListFetch.value?.streams.length ?? 0 },
              }
            )}
          </EuiText>

          <EuiButtonEmpty iconType="securitySignalDetected" disabled={selectedStreams.length === 0}>
            {RUN_STREAM_DISCOVERY_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <StreamsTreeTable
          streams={streamsListFetch.value?.streams}
          loading={streamsListFetch.loading}
          onSelectionChange={setSelectedStreams}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
