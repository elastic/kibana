/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import type { DatasetQualityDetailsController } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { useKibana } from '../../hooks/use_kibana';

export function StreamDetailDataQuality({
  controller,
  definition,
}: {
  controller: DatasetQualityDetailsController | undefined;
  definition: Streams.ingest.all.GetResponse;
}) {
  const { datasetQuality } = useKibana().dependencies.start;

  return controller ? (
    <datasetQuality.DatasetQualityDetails controller={controller} />
  ) : (
    i18n.translate('xpack.streams.streamQualityDetails.loadingMessage', {
      defaultMessage: 'Loading...',
    })
  );
}
