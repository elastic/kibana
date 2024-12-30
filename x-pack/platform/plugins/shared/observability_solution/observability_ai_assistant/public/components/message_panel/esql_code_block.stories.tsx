/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import { ComponentProps } from 'react';
import { EuiPanel } from '@elastic/eui';
import { EsqlCodeBlock as Component } from './esql_code_block';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/ES|QL Code Block',
};

export default meta;

const render = (props: ComponentProps<typeof Component>) => {
  return (
    <EuiPanel hasBorder hasShadow={false}>
      <Component {...props} />
    </EuiPanel>
  );
};

export const Simple: ComponentStoryObj<typeof Component> = {
  args: {
    value: `FROM packetbeat-*
    | STATS COUNT_DISTINCT(destination.domain)`,
  },
  render,
};
