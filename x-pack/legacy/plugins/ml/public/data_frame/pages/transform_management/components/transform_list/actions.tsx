/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DataFrameTransformListRow, DATA_FRAME_TRANSFORM_STATE } from '../../../../common';
import { StartAction } from './action_start';
import { StopAction } from './action_stop';
import { DeleteAction } from './action_delete';

export const getActions = ({ forceDisable }: { forceDisable: boolean }) => {
  return [
    {
      isPrimary: true,
      render: (item: DataFrameTransformListRow) => {
        if (item.stats.state === DATA_FRAME_TRANSFORM_STATE.STOPPED) {
          return <StartAction items={[item]} forceDisable={forceDisable} />;
        }
        return <StopAction items={[item]} forceDisable={forceDisable} />;
      },
    },
    {
      render: (item: DataFrameTransformListRow) => {
        return <DeleteAction items={[item]} forceDisable={forceDisable} />;
      },
    },
  ];
};
