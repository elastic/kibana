/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse, isWiredStreamGetResponse, ProcessorDefinition, IngestUpsertRequest } from '@kbn/streams-schema';

import { RootState } from '../store';
import { getStreamsClient, getCoreStart } from '../services';
import { processorConverter } from '../../components/data_management/stream_detail_enrichment/utils';
import { 
  setProcessors, 
  setInitialProcessors, 
  setSavingChanges, 
  setFields,
  mergeFields
} from './definition_slice';
import { watchProcessor } from '../processing_simulator/processing_simulator_slice';
import { DetectedField } from '../../components/data_management/stream_detail_enrichment/types';

export const initializeDefinition = createAsyncThunk(
  'definition/initialize',
  (
    { definition }: { definition: IngestStreamGetResponse },
    { dispatch }
  ) => {
    const processors = createProcessorsList(definition.stream.ingest.processing);
    dispatch(setInitialProcessors(processors));
    
    if (isWiredStreamGetResponse(definition)) {
      dispatch(setFields(definition.stream.ingest.wired.fields));
    }
  }
);

export const addProcessorWithFields = createAsyncThunk(
  'definition/addProcessorWithFields',
  async (
    {
      newProcessor,
      newFields,
      definition
    }: {
      newProcessor: ProcessorDefinition;
      newFields?: DetectedField[];
      definition: IngestStreamGetResponse;
    },
    { dispatch }
  ) => {
    dispatch({ type: 'definition/addProcessor', payload: { processor: newProcessor } });
    
    const uiProcessor = processorConverter.toUIDefinition(newProcessor, { status: 'draft' });
    dispatch(watchProcessor(uiProcessor));
    
    if (isWiredStreamGetResponse(definition) && newFields) {
      dispatch(mergeFields({ 
        newFields, 
        inheritedFields: definition.inherited_fields 
      }));
    }
  }
);

export const saveChanges = createAsyncThunk(
  'definition/saveChanges',
  async (
    { 
      definition,
      onSuccess 
    }: { 
      definition: IngestStreamGetResponse;
      onSuccess: () => void;
    },
    { getState, dispatch }
  ) => {
    dispatch(setSavingChanges(true));
    try {
      const state = getState() as RootState;
      const { processors, fields } = state.definition;
      
      const nextProcessorDefinitions = processors.map(processorConverter.toAPIDefinition);
      
      const streamsClient = getStreamsClient();
      await streamsClient.fetch(`PUT /api/streams/{name}/_ingest`, {
        params: {
          path: {
            name: definition.stream.name,
          },
          body: {
            ingest: {
              ...definition.stream.ingest,
              processing: nextProcessorDefinitions,
              ...(isWiredStreamGetResponse(definition) && { wired: { fields } }),
            },
          } as IngestUpsertRequest,
        },
      });

      const core = getCoreStart();
      core.notifications.toasts.addSuccess(
        i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesSuccess',
          { defaultMessage: "Stream's processors updated" }
        )
      );

      onSuccess();
      return true;
    } catch (error) {
      const core = getCoreStart();
      core.notifications.toasts.addError(new Error(error.body.message), {
        title: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesError',
          { defaultMessage: "An issue occurred saving processors' changes." }
        ),
        toastMessage: error.body.message,
      });
      return false;
    } finally {
      dispatch(setSavingChanges(false));
    }
  }
);

// Helper function
const createProcessorsList = (processors: ProcessorDefinition[]) => {
  return processors.map((processor) => processorConverter.toUIDefinition(processor));
};
