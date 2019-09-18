/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import { takeLatest, call, put, select, cps } from 'redux-saga/effects';
import { GraphWorkspaceSavedObject, Workspace } from '../types';
import { GraphStoreDependencies, GraphState } from '.';
import { setDatasource, datasourceSelector, IndexpatternDatasource } from './datasource';
import { loadFields, selectedFieldsSelector } from './fields';
import { updateSettings, settingsSelector } from './advanced_settings';
import { loadTemplates, templatesSelector } from './url_templates';
import {
  lookupIndexPattern,
  savedWorkspaceToAppState,
  appStateToSavedWorkspace,
} from '../services/persistence';
import { updateMetaData, metaDataSelector } from './meta_data';
import { openSaveModal, SaveWorkspaceHandler } from '../services/save_modal';
import { getEditPath } from '../services/url';
const actionCreator = actionCreatorFactory('x-pack/graph');

export const reset = actionCreator<void>('RESET');