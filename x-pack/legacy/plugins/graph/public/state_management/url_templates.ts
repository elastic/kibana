/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { GraphState } from './store';
import { UrlTemplate } from '../types';
import { reset } from './global';

const actionCreator = actionCreatorFactory('x-pack/graph/urlTemplates');

export const loadTemplates = actionCreator<UrlTemplate[]>('LOAD_TEMPLATES');
export const saveTemplate = actionCreator<{ index: number; template: UrlTemplate }>(
  'SAVE_TEMPLATE'
);
export const removeTemplate = actionCreator<UrlTemplate>('REMOVE_TEMPLATE');

export type UrlTemplatesState = UrlTemplate[];

const initialTemplates: UrlTemplatesState = [];

export const urlTemplatesReducer = reducerWithInitialState(initialTemplates)
  .case(reset, () => initialTemplates)
  .case(loadTemplates, (_currenTemplates, newTemplates) => newTemplates)
  .case(saveTemplate, (templates, { index: indexToUpdate, template: newTemplate }) =>
    indexToUpdate === -1
      ? [...templates, newTemplate]
      : templates.map((template, index) => (index === indexToUpdate ? newTemplate : template))
  )
  .case(removeTemplate, (templates, templateToDelete) =>
    templates.filter(template => template !== templateToDelete)
  )
  .build();

export const templatesSelector = (state: GraphState) => state.urlTemplates;
