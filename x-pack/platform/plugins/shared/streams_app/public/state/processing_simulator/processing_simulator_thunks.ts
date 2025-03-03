/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { isEmpty, isEqual } from 'lodash';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { isSchema, processorDefinitionSchema, FlattenRecord } from '@kbn/streams-schema';

import { RootState } from '../store';
import { getStreamsClient } from '../services';
import { processorConverter } from '../../components/data_management/stream_detail_enrichment/utils';
import { composeSamplingCondition, filterDocumentsByOutcome } from './processing_simulator_utils';
import { 
  setLoading, 
  setSamples, 
  setSimulation, 
  setError, 
  setFilteredSamples, 
  updateTableColumns 
} from './processing_simulator_slice';

export const fetchSamples = createAsyncThunk(
  'processingSimulator/fetchSamples',
  async (
    {
      streamName,
      startTime,
      endTime,
    }: { streamName: string; startTime?: number; endTime?: number },
    { getState, dispatch }
  ) => {
    dispatch(setLoading(true));
    try {
      const state = getState() as RootState;
      const { liveDraftProcessors } = state.processingSimulator;
      
      const samplingCondition = composeSamplingCondition(liveDraftProcessors);
      
      const streamsClient = getStreamsClient();
      const samplesBody = await streamsClient.fetch('POST /api/streams/{name}/_sample', {
        params: {
          path: { name: streamName },
          body: {
            if: samplingCondition,
            start: startTime,
            end: endTime,
            size: 100,
          },
        },
      });

      const samples = samplesBody.documents.map((doc) => 
        flattenObjectNestedLast(doc)
      ) as FlattenRecord[];
      
      dispatch(setSamples(samples));
      
      // After getting samples, refresh simulation if available
      if (samples.length && !isEmpty(liveDraftProcessors)) {
        dispatch(runSimulation({ streamName }));
      }
      
      return samples;
    } catch (error) {
      dispatch(setError(error));
      return [];
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const runSimulation = createAsyncThunk(
  'processingSimulator/runSimulation',
  async ({ streamName }: { streamName: string }, { getState, dispatch }) => {
    dispatch(setLoading(true));
    try {
      const state = getState() as RootState;
      const { samples, liveDraftProcessors, selectedDocsFilter, simulation: prevSimulation } = state.processingSimulator;
      
      if (isEmpty(samples) || isEmpty(liveDraftProcessors)) {
        return prevSimulation;
      }

      const processing = liveDraftProcessors.map(processorConverter.toAPIDefinition);
      
      const hasValidProcessors = processing.every((processor) =>
        isSchema(processorDefinitionSchema, processor)
      );

      if (!hasValidProcessors) {
        return prevSimulation;
      }

      const streamsClient = getStreamsClient();
      const simulation = await streamsClient.fetch('POST /api/streams/{name}/processing/_simulate', {
        params: {
          path: { name: streamName },
          body: {
            documents: samples,
            processing: liveDraftProcessors.map(processorConverter.toSimulateDefinition),
          },
        },
      });

      dispatch(setSimulation(simulation));
      
      // Update table columns based on detected fields
      dispatch(updateTableColumns({ 
        detectedFields: simulation.detected_fields || [] 
      }));
      
      // Update filtered samples based on the selected filter
      const filteredDocs = filterDocumentsByOutcome(simulation, selectedDocsFilter);
      dispatch(setFilteredSamples(filteredDocs.map((doc) => doc.value)));
      
      return simulation;
    } catch (error) {
      dispatch(setError(error));
      dispatch(updateTableColumns({ detectedFields: [] }));
      return null;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const updateFilteredSamples = createAsyncThunk(
  'processingSimulator/updateFilteredSamples',
  (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { simulation, selectedDocsFilter, samples } = state.processingSimulator;
    
    if (!simulation?.documents) {
      dispatch(setFilteredSamples(samples));
      return;
    }
    
    const filteredDocs = filterDocumentsByOutcome(simulation, selectedDocsFilter);
    dispatch(setFilteredSamples(filteredDocs.map((doc) => doc.value)));
  }
);
