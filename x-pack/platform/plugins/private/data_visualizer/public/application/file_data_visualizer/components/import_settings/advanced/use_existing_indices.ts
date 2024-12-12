/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useDataVisualizerKibana } from '../../../../kibana_context';

interface EsIndex {
  name: string;
  hidden: boolean;
  frozen: boolean;
}

type Pipeline = estypes.IngestPipelineConfig & {
  name: string;
};

export function useExistingIndices() {
  const {
    services: { http },
  } = useDataVisualizerKibana();

  const [indices, setIndices] = useState<EsIndex[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const loadIndices = useCallback(() => {
    http.get<EsIndex[]>('/api/index_management/indices').then((resp) => {
      setIndices(resp.filter((i) => !(i.hidden || i.frozen)));
    });
  }, [http]);

  const loadPipelines = useCallback(() => {
    http.get<Pipeline[]>('/api/ingest_pipelines').then((resp) => {
      setPipelines(resp.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, [http]);

  useEffect(() => {
    loadIndices();
    loadPipelines();
  }, [loadIndices, loadPipelines]);

  const getMapping = useCallback(
    async (indexName: string) => {
      const resp = await http.get<estypes.IndicesGetFieldMappingTypeFieldMappings>(
        `/api/index_management/mapping/${indexName}`
      );
      return resp.mappings;
    },
    [http]
  );

  return { indices, pipelines, getMapping };
}
