/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datasource } from '../../types';
import { TextBasedPrivateState } from './types';

export const removeColumn: Datasource<TextBasedPrivateState>['removeColumn'] = ({
  prevState,
  layerId,
  columnId,
}) => {
  return {
    ...prevState,
    layers: {
      ...prevState.layers,
      [layerId]: {
        ...prevState.layers[layerId],
        columns: prevState.layers[layerId].columns.filter((col) => col.columnId !== columnId),
      },
    },
  };
};
