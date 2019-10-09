/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { JsonEditor, OnUpdateHandler } from '../../../../../json_editor';

interface Props {
  onUpdate: OnUpdateHandler;
  defaultValue: { [key: string]: any };
}

export const FieldSettingsJsonEditor = ({ onUpdate, defaultValue = {} }: Props) => {
  return <JsonEditor label="Field settings" onUpdate={onUpdate} defaultValue={defaultValue} />;
};
