/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ElasticsearchNodes } from '../index';

const randValue = [5, 2, 9, 30, 11, 15, 21, 37, 45, 66, 3, 6, 92, 1, 1, 7, 3, 10, 31];
const valAsc = ['n1', 'n1', 'n2', 'n3', 'n3', 'n5', 'n6', 'n7', 'n9', 'n10'];
const valDesc = ['n92', 'n66', 'n45', 'n37', 'n31', 'n30', 'n21', 'n15', 'n11', 'n10'];

const metricTypes = ['node_cpu_utilization', 'node_load_average', 'node_jvm_mem_percent', 'node_free_space'];

const getProps = (field) => {
  const metricObj = {
    metric: {
      app: 'elasticsearch',
      description: 'Free disk space available on the node.',
      field: 'node_stats.fs.total.available_in_bytes',
      format: '0.0 b',
      hasCalculation: false,
      isDerivative: false,
      label: 'Disk Free Space',
      metricAgg: 'max',
      units: ''
    },
    summary: {
      lastVal: 0,
      maxVal: 0,
      minVal: 0,
      slope: 1
    }
  };

  const node = {
    isOnline: true,
    name: 'n',
    nodeTypeClass: 'fa-star',
    nodeTypeLabel: 'Master Node',
    node_cpu_utilization: { ...metricObj },
    node_load_average: { ...metricObj },
    node_jvm_mem_percent: { ...metricObj },
    node_free_space: { ...metricObj },
    resolver: '8FNpj67bS7aRd2D6GLHD7A',
    shardCount: 30,
    transport_address: '127.0.0.1:9300',
    type: 'master'
  };

  const nodes = [];

  for (let i = 0; i < 20; ++i) {
    const copyNode = JSON.parse(JSON.stringify(node));
    const value = randValue[i];
    copyNode.name = `${copyNode.name}${value}`;
    copyNode[field].summary.lastVal = value;
    nodes.push(copyNode);
  }

  return {
    clusterStatus: {
      dataSize: 86843790,
      documentCount: 200079,
      indicesCount: 15,
      memMax: 1037959168,
      memUsed: 394748136,
      nodesCount: 1,
      status: 'yellow',
      totalShards: 17,
      unassignedShards: 2,
      upTime: 28056934,
      version: ['8.0.0']
    },
    setupMode: {},
    nodes,
    sorting: {
      sort: { field: 'name', direction: 'asc' }
    },
    pagination: {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 20, 50]
    },
    onTableChange: () => void 0
  };
};

const getSortedValues = (field, direction) => {
  const props = getProps(field);
  props.sorting = { sort: { field, direction } };
  const wrapper = mountWithIntl(
    <ElasticsearchNodes
      {...props}
    />
  );

  const table = wrapper.find(EuiInMemoryTable);
  const rows = table.find('.euiLink--primary');
  return rows.map((_, i) => rows.get(i).props.children);
};

describe('Node Listing Metric Cell sorting', () => {
  for (const type of metricTypes) {
    it(`should correctly sort ${type}`, () => {
      expect(getSortedValues(type, 'asc')).toEqual(valAsc);
      expect(getSortedValues(type, 'desc')).toEqual(valDesc);
    });
  }
});
