/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import {
  DatasetQualityDetailsController,
  DatasetQualityView,
} from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { useKibana } from '../../../hooks/use_kibana';

export function StreamDetailDataQuality({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const { datasetQuality } = useKibana().dependencies.start;

  const [controller, setController] = useState<DatasetQualityDetailsController>();

  useEffect(() => {
    async function getDatasetQualityDetailsController() {
      const initialState = {
        dataStream: definition.stream.name,
        view: 'streams' as DatasetQualityView,
      };

      const datasetQualityDetailsController =
        await datasetQuality.createDatasetQualityDetailsController({
          initialState,
        });
      datasetQualityDetailsController.service.start();

      setController(datasetQualityDetailsController);

      return () => {
        datasetQualityDetailsController.service.stop();
      };
    }

    getDatasetQualityDetailsController();
  }, [datasetQuality, definition.stream.name]);

  return controller ? (
    <datasetQuality.DatasetQualityDetails controller={controller} />
  ) : (
    'Loading...'
  );
}
