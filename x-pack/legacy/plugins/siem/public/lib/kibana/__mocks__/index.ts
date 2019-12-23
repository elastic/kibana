/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createKibanaContextProviderMock,
  createUseUiSettingMock,
  createUseUiSetting$Mock,
  createUseKibanaMock,
  createWithKibanaMock,
} from '../../../mock/kibana_react';

export const useKibana = jest.fn(createUseKibanaMock());
export const useUiSetting = jest.fn(createUseUiSettingMock());
export const useUiSetting$ = jest.fn(createUseUiSetting$Mock());
export const withKibana = jest.fn(createWithKibanaMock());
export const KibanaContextProvider = jest.fn(createKibanaContextProviderMock());
