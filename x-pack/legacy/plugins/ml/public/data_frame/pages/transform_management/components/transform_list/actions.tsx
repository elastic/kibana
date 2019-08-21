/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DataFrameTransformListRow, DATA_FRAME_TRANSFORM_STATE } from './common';
import { StartAction } from './action_start';
import { StopAction } from './action_stop';
import { DeleteAction } from './action_delete';

export const getActions = (transformSelection: DataFrameTransformListRow[]) => {
  let disable = false;
  return [
    {
      isPrimary: true,
      render: (item: DataFrameTransformListRow) => {
        disable = transformSelection.some(transform => transform.id === item.id);
        if (item.stats.state === DATA_FRAME_TRANSFORM_STATE.STOPPED) {
          return <StartAction items={[item]} forceDisable={disable} />;
        }
        return <StopAction items={[item]} forceDisable={disable} />;
      },
    },
    {
      render: (item: DataFrameTransformListRow) => {
        return <DeleteAction items={[item]} forceDisable={disable} />;
      },
    },
  ];
};
