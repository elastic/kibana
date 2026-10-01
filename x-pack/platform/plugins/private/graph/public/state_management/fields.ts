/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { createSelector } from './create_selector';
import type { WorkspaceField } from '../types';
import type { GraphState, GraphStoreDependencies, StartGraphListening } from './store';
import { reset } from './global';
import { setDatasource } from './datasource';
import type { InferActionType, MatchedAction } from './helpers';
import { matchesAction } from './helpers';

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
  .case(setDatasource, () => initialFields)
  .case(loadFields, (_currentFields, newFields) => {
    const newFieldMap: Record<string, WorkspaceField> = {};
    newFields.forEach((field) => {
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

export const fieldMapSelector = (state: GraphState) => state.fields;
export const fieldsSelector = createSelector(fieldMapSelector, (fields) => Object.values(fields));
export const selectedFieldsSelector = createSelector(fieldsSelector, (fields) =>
  fields.filter((field) => field.selected)
);
export const liveResponseFieldsSelector = createSelector(selectedFieldsSelector, (fields) =>
  fields.filter((field) => field.hopSize && field.hopSize > 0)
);
export const hasFieldsSelector = createSelector(
  selectedFieldsSelector,
  (fields) => fields.length > 0
);

export const registerFieldsListeners = (
  startListening: StartGraphListening,
  { getRuntimeGraph, notifyReact }: GraphStoreDependencies
) => {
  /**
   * Keep mutable D3 nodes visually aligned with field styles stored in Redux.
   */
  startListening({
    matcher: matchesAction(updateFieldProperties),
    effect: (action: MatchedAction<InferActionType<typeof updateFieldProperties>>, listenerApi) => {
      listenerApi.cancelActiveListeners();
      const runtimeGraph = getRuntimeGraph();
      if (!runtimeGraph) {
        return;
      }

      const { color, icon } = action.payload.fieldProperties;
      runtimeGraph.nodes.forEach((node) => {
        if (node.data.field !== action.payload.fieldName) {
          return;
        }
        if (color) {
          node.color = color;
        }
        if (icon) {
          node.icon = icon;
        }
      });
      notifyReact();
    },
  });
};
