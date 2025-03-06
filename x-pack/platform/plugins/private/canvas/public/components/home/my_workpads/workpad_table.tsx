/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { useSelector } from 'react-redux';

import type { State } from '../../../../types';
import { canUserWrite as canUserWriteSelector } from '../../../state/selectors/app';
import { useDownloadWorkpad } from '../../hooks';
import { useCloneWorkpad } from '../hooks';

import { coreServices } from '../../../services/kibana_services';
import { WorkpadsContext } from './my_workpads';
import { WorkpadTable as Component } from './workpad_table.component';

export const WorkpadTable = () => {
  const onCloneWorkpad = useCloneWorkpad();
  const onExportWorkpad = useDownloadWorkpad();
  const context = useContext(WorkpadsContext);

  const { canUserWrite } = useSelector((state: State) => ({
    canUserWrite: canUserWriteSelector(state),
  }));

  if (!context) {
    return null;
  }

  const { workpads } = context;

  const dateFormat = coreServices.uiSettings.get('dateFormat');

  return <Component {...{ workpads, dateFormat, canUserWrite, onCloneWorkpad, onExportWorkpad }} />;
};
