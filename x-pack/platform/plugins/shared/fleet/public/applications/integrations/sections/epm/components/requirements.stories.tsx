/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Requirements as Component } from './requirements';

export default {
  component: Component,
  title: 'Sections/EPM/Requirements',
};

interface Args {
  width: number;
}

const args: Args = {
  width: 250,
};

export const Requirements = {
  render: ({ width }: Args) => {
    return (
      <div style={{ width }}>
        <Component
          requirements={{
            kibana: {
              version: '1.2.3',
            },
          }}
        />
      </div>
    );
  },

  args,
};
