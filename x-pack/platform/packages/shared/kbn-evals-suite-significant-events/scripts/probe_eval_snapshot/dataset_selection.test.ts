/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INCIDENTS_NAMESPACE } from '../../src/constants';
import {
  getAllDatasetIds,
  getDefaultDatasetIds,
  resolveRequestedDatasets,
} from '../../src/datasets';
import { planProbeDatasets } from './dataset_selection';

const planIds = (selectedDatasetIds: string | undefined): string[] =>
  planProbeDatasets(resolveRequestedDatasets(selectedDatasetIds)).datasetsToProbe.map(
    ({ id }) => id
  );

const planMessage = (selectedDatasetIds: string | undefined): string | undefined =>
  planProbeDatasets(resolveRequestedDatasets(selectedDatasetIds)).unsupportedDatasetsMessage;

describe('planProbeDatasets', () => {
  it('probes every dataset of an implicit default selection', () => {
    expect(planIds(undefined)).toEqual(getDefaultDatasetIds());
    expect(planMessage(undefined)).toBeUndefined();
  });

  it('probes only the supported datasets of a mixed selection and reports the rest', () => {
    expect(planIds('all')).toEqual(getAllDatasetIds().filter((id) => id !== INCIDENTS_NAMESPACE));
    expect(planMessage('all')).toBe(
      `probe_eval_snapshot does not support datasets with replayMode "managed-stream": ${INCIDENTS_NAMESPACE}.`
    );
  });

  it('probes nothing when every selected dataset is unsupported', () => {
    expect(planIds(INCIDENTS_NAMESPACE)).toEqual([]);
    expect(planMessage(INCIDENTS_NAMESPACE)).toBe(
      `probe_eval_snapshot does not support datasets with replayMode "managed-stream": ${INCIDENTS_NAMESPACE}.`
    );
  });
});
