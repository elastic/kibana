/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../hooks/use_kibana';
import { useDatasetQualityController } from '../../hooks/use_dataset_quality_controller';

export function StreamDetailDataQuality({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition?: () => void;
}) {
  const { datasetQuality } = useKibana().dependencies.start;

  const controller = useDatasetQualityController(definition, true, refreshDefinition);

  return controller ? (
    <datasetQuality.DatasetQualityDetails controller={controller} />
  ) : (
    i18n.translate('xpack.streams.streamQualityDetails.loadingMessage', {
      defaultMessage: 'Loading...',
    })
  );
}
