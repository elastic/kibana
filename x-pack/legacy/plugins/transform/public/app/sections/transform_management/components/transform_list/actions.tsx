/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TransformListRow, TRANSFORM_STATE } from '../../../../common';
import { StartAction } from './action_start';
import { StopAction } from './action_stop';
import { DeleteAction } from './action_delete';

export const getActions = ({ forceDisable }: { forceDisable: boolean }) => {
  return [
    {
      isPrimary: true,
      render: (item: TransformListRow) => {
        if (item.stats.state === TRANSFORM_STATE.STOPPED) {
          return <StartAction items={[item]} forceDisable={forceDisable} />;
        }
        return <StopAction items={[item]} forceDisable={forceDisable} />;
      },
    },
    {
      render: (item: TransformListRow) => {
        return <DeleteAction items={[item]} forceDisable={forceDisable} />;
      },
    },
  ];
};
