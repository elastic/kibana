/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect } from 'react';
import type { RootState, AppDispatch } from './store';
import { IngestStreamGetResponse } from '@kbn/streams-schema';

import { watchProcessor as watchProcessorAction } from './processing_simulator/processing_simulator_slice';
import { 
  updateProcessor as updateProcessorAction, 
  deleteProcessor as deleteProcessorAction 
} from './definition/definition_slice';
import { 
  fetchSamples, 
  runSimulation, 
  updateFilteredSamples 
} from './processing_simulator/processing_simulator_thunks';
import { 
  initializeDefinition, 
  addProcessorWithFields, 
  saveChanges 
} from './definition/definition_thunks';
import { ProcessorDefinitionWithUIAttributes, DetectedField } from '../components/data_management/stream_detail_enrichment/types';
import { ProcessorDefinition } from '@kbn/streams-schema';
import { DocsFilterOption } from './processing_simulator/processing_simulator_utils';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useProcessingSimulator = (
  definition: IngestStreamGetResponse,
  processors: ProcessorDefinitionWithUIAttributes[],
) => {
  const dispatch = useAppDispatch();
  
  const {
    liveDraftProcessors,
    samples,
    filteredSamples,
    tableColumns,
    simulation,
    isLoading,
    error,
    selectedDocsFilter,
  } = useAppSelector((state) => state.processingSimulator);
  
  const hasLiveChanges = liveDraftProcessors.length > 0;

  const refreshSamples = useCallback(() => {
    dispatch(fetchSamples({
      streamName: definition.stream.name,
      // Add time range if needed
    }));
  }, [dispatch, definition]);

  const refreshSimulation = useCallback(() => {
    dispatch(runSimulation({ streamName: definition.stream.name }));
  }, [dispatch, definition]);

  const watchProcessor = useCallback(
    (
      processor: ProcessorDefinitionWithUIAttributes | { id: string; deleteIfExists: true }
    ) => {
      dispatch(watchProcessorAction(processor));
    },
    [dispatch]
  );

  const setSelectedDocsFilter = useCallback(
    (filter: DocsFilterOption) => {
      dispatch({ type: 'processingSimulator/setSelectedDocsFilter', payload: filter });
      dispatch(updateFilteredSamples());
    },
    [dispatch]
  );

  // Initialize with processors when they change
  useEffect(() => {
    if (processors.length > 0) {
      dispatch({ type: 'processingSimulator/setLiveDraftProcessors', payload: processors.filter(p => p.status === 'draft') });
    }
  }, [dispatch, processors]);

  return {
    hasLiveChanges,
    error,
    isLoading,
    samples,
    filteredSamples,
    simulation,
    tableColumns,
    refreshSamples,
    watchProcessor,
    refreshSimulation,
    selectedDocsFilter,
    setSelectedDocsFilter,
  };
};

export const useDefinition = (
  definition: IngestStreamGetResponse,
  refreshDefinition: () => void
) => {
  const dispatch = useAppDispatch();
  
  const {
    processors,
    initialProcessors,
    isSavingChanges,
  } = useAppSelector(state => state.definition);

  // Helper to check if processors have changed (count, status, or order)
  const hasChanges = useCallback(() => {
    return (
      processors.length !== initialProcessors.length ||
      processors.some((proc) => proc.status === 'draft' || proc.status === 'updated') ||
      processors.some((proc, index) => 
        index < initialProcessors.length && proc.id !== initialProcessors[index].id
      )
    );
  }, [processors, initialProcessors]);

  const addProcessor = useCallback(
    (newProcessor: ProcessorDefinition, newFields?: DetectedField[]) => {
      dispatch(addProcessorWithFields({ 
        newProcessor, 
        newFields, 
        definition 
      }));
    },
    [dispatch, definition]
  );

  const updateProcessor = useCallback(
    (
      id: string,
      processor: ProcessorDefinition,
      status: ProcessorDefinitionWithUIAttributes['status']