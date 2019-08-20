/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { Config } from '../config';
import { Graph } from '../graph';

describe('Config class', () => {
  let configJson;
  beforeEach(() => {
    configJson = {
      graph: {
        vertices: [],
        edges: []
      }
    };
  });

  it('calling constructor creates a Config instance with given data', () => {
    const config = new Config(configJson);
    expect(config).to.be.a(Config);
    expect(config.graph).to.be.a(Graph);
  });

  it('calling update() updates the data in the config instance', () => {
    const config = new Config(configJson);
    const graphUpdateSpy = sinon.spy(config.graph, 'update');

    config.update(configJson);
    expect(graphUpdateSpy.calledWith(configJson.graph)).to.be(true);
  });
});
