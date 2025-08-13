/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import {
  DatasetQualityDetailsController,
  DatasetQualityView,
} from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { useKibana } from './use_kibana';

export const useDatasetQualityController = (
  definition: Streams.ingest.all.GetResponse
): DatasetQualityDetailsController | undefined => {
  const controllerRef = useRef<DatasetQualityDetailsController>();
  const { datasetQuality } = useKibana().dependencies.start;
  const [controller, setController] = useState<DatasetQualityDetailsController>();

  useEffect(() => {
    let isMounted = true;

    const initController = async () => {
      if (controllerRef.current) {
        // Already created, just set the state
        setController(controllerRef.current);
        return;
      }

      const initialState = {
        dataStream: definition.stream.name,
        view: 'streams' as DatasetQualityView,
      };

      const datasetQualityDetailsController =
        await datasetQuality.createDatasetQualityDetailsController({
          initialState,
        });

      datasetQualityDetailsController.service.start();

      if (isMounted) {
        controllerRef.current = datasetQualityDetailsController;
        setController(datasetQualityDetailsController);
      }
    };

    initController();

    return () => {
      isMounted = false;
      if (controllerRef.current) {
        controllerRef.current.service.stop();
        controllerRef.current = undefined;
      }
    };
  }, [datasetQuality, definition.stream.name]);

  return controller;
};
