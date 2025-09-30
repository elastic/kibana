/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Determine node type using following rules:
 *  - data only node: --node.master=false
 *  - master only node: --node.data=false
 *  - client only node: --node.data=false --node.master=false
 *  https://www.elastic.co/guide/en/elasticsearch/reference/2.x/modules-node.html
 */
import { isUndefined } from 'lodash';
import type { ElasticsearchLegacySource } from '../../../../common/types/es';

export type Node = ElasticsearchLegacySource['source_node'] & {
  attributes?: Record<string, any>;
  node_ids?: Array<string | boolean | undefined>;
};

export function calculateNodeType(node: Node, masterNodeId?: string | boolean) {
  const attrs = node.attributes || {};

  function mightBe(attr?: string) {
    return attr === 'true' || isUndefined(attr);
  }

  function isNot(attr?: string) {
    return attr === 'false';
  }

  const uuid = node.uuid ?? node.id;

  if (uuid !== undefined && uuid === masterNodeId) {
    return 'master';
  }
  if (node.node_ids?.includes(masterNodeId)) {
    return 'master';
  }
  if (isNot(attrs.data) && isNot(attrs.master)) {
    return 'client';
  }
  if (mightBe(attrs.master) && isNot(attrs.data)) {
    return 'master_only';
  }
  if (mightBe(attrs.data) && isNot(attrs.master)) {
    return 'data';
  }

  return 'node';
}
