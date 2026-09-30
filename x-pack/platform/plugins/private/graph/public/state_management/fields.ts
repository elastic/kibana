/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'typescript-fsa';
import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { createSelector } from './create_selector';
import type { WorkspaceField } from '../types';
import type { GraphState, GraphStoreDependencies, StartGraphListening } from './store';
import { reset } from './global';
import { setDatasource } from './datasource';
import type { InferActionType } from './helpers';
import { matchesOne } from './helpers';

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

/**
 * Listener making notifying react when fields are selected to re-calculate the state of the save button.
 *
 * Won't be necessary once the workspace is moved to redux
 */
export const registerFieldsListeners = (
  startListening: StartGraphListening,
  { getWorkspace, notifyReact }: GraphStoreDependencies
) => {
  startListening({
    predicate: matchesOne(selectField, deselectField),
    effect: () => notifyReact(),
  });

  /**
   * Listener making sure the fields in the store are always synced with the fields
   * known to the workspace.
   *
   * Won't be necessary once the workspace is moved to redux
   */
  startListening({
    predicate: matchesOne(loadFields, selectField, deselectField, updateFieldProperties),
    effect: (_action, listenerApi) => {
      const workspace = getWorkspace();
      if (workspace) {
        workspace.options.vertex_fields = selectedFieldsSelector(listenerApi.getState());
      }
    },
  });

  /**
   * Listener making sure the field styles (icons and colors) are applied to nodes currently active
   * in the workspace.
   *
   * Won't be necessary once the workspace is moved to redux
   */
  startListening({
    predicate: updateFieldProperties.match,
    effect: (unknownAction, listenerApi) => {
      listenerApi.cancelActiveListeners();
      const action = unknownAction as unknown as Action<
        InferActionType<typeof updateFieldProperties>
      >;
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      const { color, icon } = action.payload.fieldProperties;
      workspace.nodes.forEach((node) => {
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
      workspace.options.vertex_fields = selectedFieldsSelector(listenerApi.getState());
    },
  });
};
