/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useUiSetting } from '../../../../../../../src/plugins/kibana_react/public';
import { Editor as BaseEditor, Props } from './editor';

export const Editor: React.FunctionComponent<Props> = props => {
  const darkMode = useUiSetting<boolean>('theme:darkMode');

  return <BaseEditor {...props} useDarkTheme={darkMode} />;
};
