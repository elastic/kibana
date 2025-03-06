/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Output } from '../../../../types';

import { OutputsTable as Component } from '.';

export default {
  component: Component,
  title: 'Sections/Fleet/Settings/OutputsTable',
};

interface Args {
  width: number;
}

const args: Args = {
  width: 1200,
};

const outputs: Output[] = [
  {
    id: 'output1',
    name: 'Demo output 1',
    is_default: true,
    is_default_monitoring: false,
    type: 'elasticsearch',
    hosts: ['http://elasticsearch-host-test.fr:9200'],
  },
  {
    id: 'output2',
    name: 'Demo output 2',
    is_default: false,
    is_default_monitoring: true,
    type: 'elasticsearch',
    hosts: ['http://test.fr:9200'],
  },
  {
    id: 'output3',
    name: 'Demo output 3',
    is_default: false,
    is_default_monitoring: false,
    type: 'elasticsearch',
    hosts: ['http://elasticsearch-host-test.fr:9200'],
  },
  {
    id: 'output4',
    name: 'Demo output 4 preconfigured',
    is_default: false,
    is_default_monitoring: false,
    is_preconfigured: true,
    type: 'elasticsearch',
    hosts: ['http://elasticsearch-host-test.fr:9200'],
  },
  {
    id: 'output5',
    name: 'Demo output 5 preconfigured with a long name really long name',
    is_default: false,
    is_default_monitoring: false,
    is_preconfigured: true,
    type: 'elasticsearch',
    hosts: ['http://elasticsearch-host-test.fr:9200'],
  },
  {
    id: 'output6',
    name: 'Demo output 6 multiple hosts',
    is_default: false,
    is_default_monitoring: false,
    type: 'elasticsearch',
    hosts: ['http://elasticsearch-host-test1.fr:443', 'http://elasticsearch-host-test2.fr:443'],
  },
  {
    id: 'output7',
    name: 'Demo output 7 both default',
    is_default: true,
    is_default_monitoring: true,
    type: 'elasticsearch',
    hosts: ['http://test.fr:9200'],
  },
  {
    id: 'output8',
    name: 'Demo output 8 long host name',
    is_default: true,
    is_default_monitoring: true,
    type: 'elasticsearch',
    hosts: ['http://elasticsearch-host-with-a-very-long-name-very-very-long.fr:9200'],
  },
];

export const OutputsTable = ({ width }: Args) => {
  return (
    <div style={{ width }}>
      <Component deleteOutput={() => {}} outputs={outputs} />
    </div>
  );
};

OutputsTable.args = args;
