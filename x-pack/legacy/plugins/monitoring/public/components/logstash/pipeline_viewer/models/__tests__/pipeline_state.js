/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { PipelineState } from '../pipeline_state';
import { Config } from '../config';

describe('PipelineState class', () => {
  let configJson;
  beforeEach(() => {
    configJson = {
      representation: {
        graph: {
          vertices: [],
          edges: [],
        },
      },
    };
  });

  it('calling constructor creates a PipelineState instance with given data', () => {
    const pipelineState = new PipelineState(configJson);
    expect(pipelineState).to.be.a(PipelineState);
    expect(pipelineState.config).to.be.a(Config);
  });

  it('calling update() updates the data in the PipelineState instance', () => {
    const pipelineState = new PipelineState(configJson);
    const configUpdateSpy = sinon.spy(pipelineState.config, 'update');

    pipelineState.update(configJson);
    expect(configUpdateSpy.calledWith(configJson.representation)).to.be(true);
  });
});
