/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from 'expect.js';
import { VisProvider } from '..';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VisTypesRegistryProvider } from '../../registry/vis_types';
import { DataAdapter, RequestAdapter } from '../../inspector/adapters';
import { Inspector } from '../../inspector/inspector';

describe('Vis Class', function () {
  let indexPattern;
  let Vis;
  let visTypes;

  let vis;
  const stateFixture = {
    type: 'pie',
    aggs: [
      { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
      { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
      { type: 'terms', schema: 'segment', params: { field: 'geo.src' } }
    ],
    params: { isDonut: true },
    listeners: { click: _.noop }
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    visTypes = Private(VisTypesRegistryProvider);
  }));

  beforeEach(function () {
    vis = new Vis(indexPattern, stateFixture);
  });

  const verifyVis = function (vis) {
    expect(vis).to.have.property('aggs');
    expect(vis.aggs).to.have.length(3);

    expect(vis).to.have.property('type');
    expect(vis.type).to.eql(visTypes.byName.pie);

    expect(vis).to.have.property('params');
    expect(vis.params).to.have.property('isDonut', true);
    expect(vis).to.have.property('indexPattern', indexPattern);
  };

  describe('initialization', function () {
    it('should set the state', function () {
      verifyVis(vis);
    });
  });

  describe('getState()', function () {
    it('should get a state that represents the... er... state', function () {
      const state = vis.getEnabledState();
      expect(state).to.have.property('type', 'pie');

      expect(state).to.have.property('params');
      expect(state.params).to.have.property('isDonut', true);

      expect(state).to.have.property('aggs');
      expect(state.aggs).to.have.length(3);
    });
  });

  describe('setState()', function () {
    it('should set the state to defualts', function () {
      const vis = new Vis(indexPattern);
      expect(vis).to.have.property('type');
      expect(vis.type).to.eql(visTypes.byName.histogram);
      expect(vis).to.have.property('aggs');
      expect(vis.aggs).to.have.length(1);
      expect(vis).to.have.property('params');
      expect(vis.params).to.have.property('addLegend', true);
      expect(vis.params).to.have.property('addTooltip', true);
    });
  });

  describe('isHierarchical()', function () {
    it('should return true for hierarchical vis (like pie)', function () {
      expect(vis.isHierarchical()).to.be(true);
    });
    it('should return false for non-hierarchical vis (like histogram)', function () {
      const vis = new Vis(indexPattern);
      expect(vis.isHierarchical()).to.be(false);
    });
  });

  describe('inspector', () => {

    // Wrap the given vis type definition in a state, that can be passed to vis
    const state = (type) => ({
      type: {
        visConfig: { defaults: {} },
        ...type,
      }
    });

    describe('hasInspector()', () => {
      it('should forward to inspectors hasInspector', () => {
        const vis = new Vis(indexPattern, state({
          inspectorAdapters: {
            data: true,
            requests: true,
          }
        }));
        sinon.spy(Inspector, 'isAvailable');
        vis.hasInspector();
        expect(Inspector.isAvailable.calledOnce).to.be(true);
        const adapters = Inspector.isAvailable.lastCall.args[0];
        expect(adapters.data).to.be.a(DataAdapter);
        expect(adapters.requests).to.be.a(RequestAdapter);
      });

      it('should return hasInspectors result', () => {
        const vis = new Vis(indexPattern, state({}));
        const stub = sinon.stub(Inspector, 'isAvailable');
        stub.returns(true);
        expect(vis.hasInspector()).to.be(true);
        stub.returns(false);
        expect(vis.hasInspector()).to.be(false);
      });

      afterEach(() => {
        Inspector.isAvailable.restore();
      });
    });

    describe('openInspector()', () => {

      beforeEach(() => {
        sinon.stub(Inspector, 'open');
      });

      it('should call openInspector with all attached inspectors', () => {
        const Foodapter = class {};
        const vis = new Vis(indexPattern, state({
          inspectorAdapters: {
            data: true,
            custom: {
              foo: Foodapter
            }
          }
        }));
        vis.openInspector();
        expect(Inspector.open.calledOnce).to.be(true);
        const adapters = Inspector.open.lastCall.args[0];
        expect(adapters).to.be(vis.API.inspectorAdapters);
      });

      it('should pass the vis title to the openInspector call', () => {
        const vis = new Vis(indexPattern, { ...state(), title: 'beautifulVis' });
        vis.openInspector();
        expect(Inspector.open.calledOnce).to.be(true);
        const params = Inspector.open.lastCall.args[1];
        expect(params.title).to.be('beautifulVis');
      });

      afterEach(() => {
        Inspector.open.restore();
      });
    });

    describe('inspectorAdapters', () => {

      it('should register none for none requestHandler', () => {
        const vis = new Vis(indexPattern, state({ requestHandler: 'none' }));
        expect(vis.API.inspectorAdapters).to.eql({});
      });

      it('should attach data and request handler for courier', () => {
        const vis = new Vis(indexPattern, state({ requestHandler: 'courier' }));
        expect(vis.API.inspectorAdapters.data).to.be.a(DataAdapter);
        expect(vis.API.inspectorAdapters.requests).to.be.a(RequestAdapter);
      });

      it('should allow enabling data adapter manually', () => {
        const vis = new Vis(indexPattern, state({
          requestHandler: 'none',
          inspectorAdapters: {
            data: true,
          }
        }));
        expect(vis.API.inspectorAdapters.data).to.be.a(DataAdapter);
      });

      it('should allow enabling requests adapter manually', () => {
        const vis = new Vis(indexPattern, state({
          requestHandler: 'none',
          inspectorAdapters: {
            requests: true,
          }
        }));
        expect(vis.API.inspectorAdapters.requests).to.be.a(RequestAdapter);
      });

      it('should allow adding custom inspector adapters via the custom key', () => {
        const Foodapter =  class {};
        const Bardapter = class {};
        const vis = new Vis(indexPattern, state({
          requestHandler: 'none',
          inspectorAdapters: {
            custom: {
              foo: Foodapter,
              bar: Bardapter,
            }
          }
        }));
        expect(vis.API.inspectorAdapters.foo).to.be.a(Foodapter);
        expect(vis.API.inspectorAdapters.bar).to.be.a(Bardapter);
      });

      it('should not share adapter instances between vis instances', () => {
        const Foodapter = class {};
        const visState = state({
          inspectorAdapters: {
            data: true,
            custom: {
              foo: Foodapter
            }
          }
        });
        const vis1 = new Vis(indexPattern, visState);
        const vis2 = new Vis(indexPattern, visState);
        expect(vis1.API.inspectorAdapters.foo).to.be.a(Foodapter);
        expect(vis2.API.inspectorAdapters.foo).to.be.a(Foodapter);
        expect(vis1.API.inspectorAdapters.foo).not.to.be(vis2.API.inspectorAdapters.foo);
        expect(vis1.API.inspectorAdapters.data).to.be.a(DataAdapter);
        expect(vis2.API.inspectorAdapters.data).to.be.a(DataAdapter);
        expect(vis1.API.inspectorAdapters.data).not.to.be(vis2.API.inspectorAdapters.data);
      });
    });

  });

});
