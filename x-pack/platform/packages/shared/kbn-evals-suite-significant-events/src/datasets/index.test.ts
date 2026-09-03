/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BANK_OF_ANTHOS_NAMESPACE,
  INCIDENTS_NAMESPACE,
  OTEL_DEMO_NAMESPACE,
  QUARKUS_SUPER_HEROES_NAMESPACE,
} from '../constants';
import { hasExplicitDatasetSelection, resolveRequestedDatasetIds } from '.';

const DEFAULT_DATASET_IDS = [
  OTEL_DEMO_NAMESPACE,
  BANK_OF_ANTHOS_NAMESPACE,
  QUARKUS_SUPER_HEROES_NAMESPACE,
];
const ALL_DATASET_IDS = [...DEFAULT_DATASET_IDS, INCIDENTS_NAMESPACE];

describe('dataset selection', () => {
  it.each([undefined, '', '   '])(
    'selects the default datasets when the selection is %j',
    (selectedDatasets) => {
      expect(hasExplicitDatasetSelection(selectedDatasets)).toBe(false);
      expect(resolveRequestedDatasetIds(selectedDatasets)).toEqual(DEFAULT_DATASET_IDS);
    }
  );

  it('selects incidents when explicitly requested', () => {
    expect(hasExplicitDatasetSelection(INCIDENTS_NAMESPACE)).toBe(true);
    expect(resolveRequestedDatasetIds(INCIDENTS_NAMESPACE)).toEqual([INCIDENTS_NAMESPACE]);
  });

  it.each(['all', `${INCIDENTS_NAMESPACE},all,${OTEL_DEMO_NAMESPACE}`])(
    'selects every registered dataset when the selection is %j',
    (selectedDatasets) => {
      expect(hasExplicitDatasetSelection(selectedDatasets)).toBe(true);
      expect(resolveRequestedDatasetIds(selectedDatasets)).toEqual(ALL_DATASET_IDS);
    }
  );

  it('trims, preserves order, and deduplicates explicit dataset ids', () => {
    const selectedDatasets = ` ${INCIDENTS_NAMESPACE}, ${QUARKUS_SUPER_HEROES_NAMESPACE}, ${INCIDENTS_NAMESPACE}, ${OTEL_DEMO_NAMESPACE} `;

    expect(hasExplicitDatasetSelection(selectedDatasets)).toBe(true);
    expect(resolveRequestedDatasetIds(selectedDatasets)).toEqual([
      INCIDENTS_NAMESPACE,
      QUARKUS_SUPER_HEROES_NAMESPACE,
      OTEL_DEMO_NAMESPACE,
    ]);
  });

  it('reports unknown and available dataset ids', () => {
    expect(() => resolveRequestedDatasetIds('missing-dataset')).toThrow(
      `Unknown dataset(s): missing-dataset. Available: ${ALL_DATASET_IDS.join(', ')}.`
    );
  });
});
