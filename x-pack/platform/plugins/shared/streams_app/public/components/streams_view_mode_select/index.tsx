/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useStreamsViewModeStorage,
  type StreamsViewMode,
} from '../../hooks/use_streams_view_mode';

const VIEW_MODE_OPTIONS: Array<{ value: StreamsViewMode; text: string }> = [
  {
    value: 'consolidated',
    text: i18n.translate('xpack.streams.viewModeSelect.consolidatedOption', {
      defaultMessage: 'Consolidated page',
    }),
  },
  {
    value: 'secondaryNav',
    text: i18n.translate('xpack.streams.viewModeSelect.secondaryNavOption', {
      defaultMessage: 'Using secondary navigation',
    }),
  },
];

export function StreamsViewModeSelect() {
  const { viewMode, setViewMode } = useStreamsViewModeStorage();

  return (
    <EuiSelect
      compressed
      data-test-subj="streamsViewModeSelect"
      prepend={i18n.translate('xpack.streams.viewModeSelect.prependLabel', {
        defaultMessage: 'View',
      })}
      aria-label={i18n.translate('xpack.streams.viewModeSelect.ariaLabel', {
        defaultMessage: 'Streams view mode',
      })}
      options={VIEW_MODE_OPTIONS}
      value={viewMode}
      onChange={(event) => setViewMode(event.target.value as StreamsViewMode)}
    />
  );
}
