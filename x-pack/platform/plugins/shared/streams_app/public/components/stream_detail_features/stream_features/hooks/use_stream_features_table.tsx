/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type Feature } from '@kbn/streams-schema';
import { EuiMarkdownFormat, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// TODO: check if all columns from the stream_existing_features_table and stream_features_table can be moved to this hook to be shared between them
export const useStreamFeaturesTable = () => {
  const descriptionColumn: EuiBasicTableColumn<Feature> = {
    field: 'description',
    name: DESCRIPTION_LABEL,
    width: '30%',
    truncateText: {
      lines: 4,
    },
    render: (description: string) => (
      <EuiMarkdownFormat textSize="xs">{description}</EuiMarkdownFormat>
    ),
  };
  return {
    descriptionColumn,
  };
};

const DESCRIPTION_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.columns.description', {
  defaultMessage: 'Description',
});
