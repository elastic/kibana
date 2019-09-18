/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest, select } from 'redux-saga/effects';
import { Action } from 'typescript-fsa';
import { GraphStoreDependencies } from './store';
import { loadFields, selectedFieldsSelector, updateFieldProperties } from './fields';
import { InferActionType } from '../types';

/**
 * Saga making sure the fields in the store are always synced with the fields
 * known to the workspace.
 * 
 * Won't be necessary once the workspace is moved to redux
 */
export const syncFieldsSaga = ({ getWorkspace }: Pick<GraphStoreDependencies, 'getWorkspace'>) =>
  function*() {
    function* syncFields() {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      const selectedFields = selectedFieldsSelector(yield select());
      workspace.options.vertex_fields = selectedFields;
    }

    yield takeLatest(loadFields.match, syncFields);
  };

/**
 * Saga making sure the field styles (icons and colors) are applied to nodes currently active
 * in the workspace.
 * 
 * Won't be necessary once the workspace is moved to redux
 */
export const syncNodeStyleSaga = ({ getWorkspace }: Pick<GraphStoreDependencies, 'getWorkspace'>) =>
  function*() {
    function* syncNodeStyle(action: Action<InferActionType<typeof updateFieldProperties>>) {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }
      const newColor = action.payload.fieldProperties.color;
      if (newColor) {
        workspace.nodes.forEach(function(node) {
          if (node.data.field === action.payload.fieldName) {
            node.color = newColor;
          }
        });
      }
      const newIcon = action.payload.fieldProperties.icon;

      if (newIcon) {
        workspace.nodes.forEach(function(node) {
          if (node.data.field === action.payload.fieldName) {
            node.icon = newIcon;
          }
        });
      }
      const selectedFields = selectedFieldsSelector(yield select());
      workspace.options.vertex_fields = selectedFields;
    }

    yield takeLatest(updateFieldProperties.match, syncNodeStyle);
  };
