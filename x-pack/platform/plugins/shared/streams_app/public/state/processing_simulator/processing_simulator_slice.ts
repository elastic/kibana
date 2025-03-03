/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isEmpty, isEqual } from 'lodash';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { FlattenRecord } from '@kbn/streams-schema';
import { ProcessorDefinitionWithUIAttributes, DetectedField } from '../../components/data_management/stream_detail_enrichment/types';
import { 
  Simulation,
  TableColumn,
  DocsFilterOption,
  composeSamplingCondition,
  getTableColumns 
} from './processing_simulator_utils';

export interface ProcessingSimulatorState {
  liveDraftProcessors: ProcessorDefinitionWithUIAttributes[];
  samples: FlattenRecord[];
  filteredSamples: FlattenRecord[];
  tableColumns: TableColumn[];
  simulation: Simulation | null;
  isLoading: boolean;
  error?: IHttpFetchError<ResponseErrorBody>;
  selectedDocsFilter: DocsFilterOption;
}

const initialState: ProcessingSimulatorState = {
  liveDraftProcessors: [],
  samples: [],
  filteredSamples: [],
  tableColumns: [],
  simulation: null,
  isLoading: false,
  selectedDocsFilter: 'outcome_filter_all',
};

export const processingSimulatorSlice = createSlice({
  name: 'processingSimulator',
  initialState,
  reducers: {
    setLiveDraftProcessors: (state, action: PayloadAction<ProcessorDefinitionWithUIAttributes[]>) => {
      state.liveDraftProcessors = action.payload;
    },
    watchProcessor: (
      state,
      action: PayloadAction<ProcessorDefinitionWithUIAttributes | { id: string; deleteIfExists: true }>
    ) => {
      const processor = action.payload;
      if ('deleteIfExists' in processor) {
        state.liveDraftProcessors = state.liveDraftProcessors.filter(
          (proc) => proc.id !== processor.id
        );
        return;
      }

      if (processor.status === 'draft') {
        const existingIndex = state.liveDraftProcessors.findIndex(
          (proc) => proc.id === processor.id
        );

        if (existingIndex !== -1) {
          state.liveDraftProcessors[existingIndex] = processor;
        } else {
          state.liveDraftProcessors.push(processor);
        }
      }
    },
    setSamples: (state, action: PayloadAction<FlattenRecord[]>) => {
      state.samples = action.payload;
    },
    setFilteredSamples: (state, action: PayloadAction<FlattenRecord[]>) => {
      state.filteredSamples = action.payload;
    },
    setSimulation: (state, action: PayloadAction<Simulation | null>) => {
      state.simulation = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<IHttpFetchError<ResponseErrorBody> | undefined>) => {
      state.error = action.payload;
    },
    setSelectedDocsFilter: (state, action: PayloadAction<DocsFilterOption>) => {
      state.selectedDocsFilter = action.payload;
    },
    updateTableColumns: (state, action: PayloadAction<{ detectedFields: DetectedField[] }>) => {
      state.tableColumns = getTableColumns(
        state.liveDraftProcessors,
        action.payload.detectedFields
      );
    },
  },
});

export const {
  setLiveDraftProcessors,
  watchProcessor,
  setSamples,
  setFilteredSamples,
  setSimulation,
  setLoading,
  setError,
  setSelectedDocsFilter,
  updateTableColumns,
} = processingSimulatorSlice.actions;

export default processingSimulatorSlice.reducer;
