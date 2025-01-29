/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Statement } from './statement';
import { PluginElement } from '../list/plugin_element';

export class PluginStatement extends Statement {
  constructor(vertex) {
    super(vertex);

    const { pluginType, name } = vertex;

    this.pluginType = pluginType; // input, filter, or output
    this.name = name; // twitter, grok, elasticsearch, etc.
  }

  toList(depth, parentId) {
    return [new PluginElement(this, depth, parentId)];
  }

  static fromPipelineGraphVertex(pluginVertex) {
    return new PluginStatement(pluginVertex);
  }
}
