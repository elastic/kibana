/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import expect from '@kbn/expect';
import { calculateNodeType } from '../calculate_node_type.js';

const masterNodeId = 'def456';

describe('Calculating Node Type from Attributes', () => {
  it('Calculates default', () => {
    const node = {};
    const result = calculateNodeType(node, masterNodeId);
    expect(result).to.be.eql('node');
  });
  it('Calculates master_only', () => {
    const node = set({}, 'attributes', { master: 'true', data: 'false' });
    const result = calculateNodeType(node, masterNodeId);
    expect(result).to.be.eql('master_only');
  });
  it('Calculates data', () => {
    const node = set({}, 'attributes', { master: 'false', data: 'true' });
    const result = calculateNodeType(node, masterNodeId);
    expect(result).to.be.eql('data');
  });
  it('Calculates client', () => {
    const node = set({}, 'attributes', { master: 'false', data: 'false' });
    const result = calculateNodeType(node, masterNodeId);
    expect(result).to.be.eql('client');
  });
  it('Calculates master', () => {
    const node = { node_ids: ['abc123', 'def456'] };
    const result = calculateNodeType(node, masterNodeId);
    expect(result).to.be.eql('master');
  });
});
