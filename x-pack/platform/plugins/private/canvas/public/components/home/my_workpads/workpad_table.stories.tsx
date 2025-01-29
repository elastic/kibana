/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiPanel } from '@elastic/eui';

import { reduxDecorator } from '../../../../storybook';
import { argTypes } from '../../../../storybook/constants';

import { getSomeWorkpads } from '../../../services/mocks';
import { WorkpadTable as Component } from './workpad_table';
import { WorkpadsContext } from './my_workpads';

const { workpadCount } = argTypes;

export default {
  title: 'Home/Components/Workpad Table',
  argTypes: { workpadCount },
  decorators: [reduxDecorator()],
  parameters: {},
};

export const WorkpadTable = (args: { findWorkpads: number }) => {
  const { findWorkpads } = args;
  const [workpads, setWorkpads] = useState(getSomeWorkpads(findWorkpads));

  useEffect(() => {
    setWorkpads(getSomeWorkpads(findWorkpads));
  }, [findWorkpads]);

  return (
    <EuiPanel>
      <WorkpadsContext.Provider value={{ workpads, setWorkpads }}>
        <Component />
      </WorkpadsContext.Provider>
    </EuiPanel>
  );
};
