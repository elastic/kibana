/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ProcessorDefinition,
  getProcessorType,
  FieldDefinition,
} from '@kbn/streams-schema';
import { ProcessorDefinitionWithUIAttributes, DetectedField } from '../../components/data_management/stream_detail_enrichment/types';
import { processorConverter } from '../../components/data_management/stream_detail_enrichment/utils';

export interface DefinitionState {
  processors: ProcessorDefinitionWithUIAttributes[];
  initialProcessors: ProcessorDefinitionWithUIAttributes[];
  fields: FieldDefinition;
  isSavingChanges: boolean;
}

const initialState: DefinitionState = {
  processors: [],
  initialProcessors: [],
  fields: {},
  isSavingChanges: false,
};

export const definitionSlice = createSlice({
  name: 'definition',
  initialState,
  reducers: {
    setProcessors: (state, action: PayloadAction<ProcessorDefinitionWithUIAttributes[]>) => {
      state.processors = action.payload;
    },
    setInitialProcessors: (state, action: PayloadAction<ProcessorDefinitionWithUIAttributes[]>) => {
      state.initialProcessors = action.payload;
      state.processors = action.payload;
    },
    addProcessor: (
      state, 
      action: PayloadAction<{ 
        processor: ProcessorDefinition;
      }>
    ) => {
      const { processor } = action.payload;
      state.processors.push(
        processorConverter.toUIDefinition(processor, { status: 'draft' })
      );
    },
    updateProcessor: (
      state,
      action: PayloadAction<{
        id: string;
        processor: ProcessorDefinition;
        status?: ProcessorDefinitionWithUIAttributes['status'];
      }>
    ) => {
      const { id, processor, status = 'updated' } = action.payload;
      const index = state.processors.findIndex((proc) => proc.id === id);
      if (index !== -1) {
        state.processors[index] = {
          ...processor,
          id,
          type: getProcessorType(processor),
          status,
        };
      }
    },
    deleteProcessor: (state, action: PayloadAction<{ id: string }>) => {
      state.processors = state.processors.filter((proc) => proc.id !== action.payload.id);
    },
    setFields: (state, action: PayloadAction<FieldDefinition>) => {
      state.fields = action.payload;
    },
    mergeFields: (state, action: PayloadAction<{ newFields: DetectedField[]; inheritedFields: Record<string, any> }>) => {
      const { newFields, inheritedFields } = action.payload;
      const updatedFields = { ...state.fields };
      
      newFields.forEach((field) => {
        if (
          !(field.name in updatedFields) &&
          !(field.name in inheritedFields) &&
          field.type !== undefined
        ) {
          updatedFields[field.name] = { type: field.type };
        }
      });
      
      state.fields = updatedFields;
    },
    setSavingChanges: (state, action: PayloadAction<boolean>) => {
      state.isSavingChanges = action.payload;
    },
    resetChanges: (state) => {
      state.processors = [...state.initialProcessors];
    },
  },
});

export const {
  setProcessors,
  setInitialProcessors,
  addProcessor,
  updateProcessor,
  deleteProcessor,
  setFields,
  mergeFields,
  setSavingChanges,
  resetChanges,
} = definitionSlice.actions;

export default definitionSlice.reducer;
