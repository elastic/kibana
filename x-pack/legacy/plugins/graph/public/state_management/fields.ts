/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { createSelector } from 'reselect';
import { WorkspaceField } from '../types';
import { GraphState } from './store';
import { reset } from './global';

const actionCreator = actionCreatorFactory('x-pack/graph/fields');

export const loadFields = actionCreator<WorkspaceField[]>('LOAD_FIELDS');
export const updateFieldProperties = actionCreator<{
  fieldName: string;
  fieldProperties: Partial<Pick<WorkspaceField, 'hopSize' | 'lastValidHopSize' | 'color' | 'icon'>>;
}>('UPDATE_FIELD_PROPERTIES');
export const selectField = actionCreator<string>('SELECT_FIELD');
export const deselectField = actionCreator<string>('DESELECT_FIELD');

export type FieldsState = Record<string, WorkspaceField>;

const initialFields: FieldsState = {};

export const fieldsReducer = reducerWithInitialState(initialFields)
  .case(reset, () => initialFields)
  .case(loadFields, (_currentFields, newFields) => {
    const newFieldMap: Record<string, WorkspaceField> = {};
    newFields.forEach(field => {
      newFieldMap[field.name] = field;
    });

    return newFieldMap;
  })
  .case(updateFieldProperties, (fields, { fieldName, fieldProperties }) => {
    return { ...fields, [fieldName]: { ...fields[fieldName], ...fieldProperties } };
  })
  .case(selectField, (fields, fieldName) => {
    return { ...fields, [fieldName]: { ...fields[fieldName], selected: true } };
  })
  .case(deselectField, (fields, fieldName) => {
    return { ...fields, [fieldName]: { ...fields[fieldName], selected: false } };
  })
  .build();

export const fieldsSelector = (state: GraphState) => Object.values(state.fields);
export const selectedFieldsSelector = createSelector(
  fieldsSelector,
  fields => fields.filter(field => field.selected)
);
export const liveResponseFieldsSelector = createSelector(
  selectedFieldsSelector,
  fields => fields.filter(field => field.hopSize && field.hopSize > 0)
);
