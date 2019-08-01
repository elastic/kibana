/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ComponentType } from 'react';
import { DataType, SubType } from '../../config';

import { TextAdvancedSettings } from './text';
import { KeywordAdvancedSettings } from './keyword';

const parameterMapToAdvancedSettingsComp: { [key in DataType | SubType]?: ComponentType<any> } = {
  text: TextAdvancedSettings,
  keyword: KeywordAdvancedSettings,
};

export const getAdvancedSettingsCompForType = (
  type: DataType | SubType
): ComponentType<any> | undefined => parameterMapToAdvancedSettingsComp[type];
