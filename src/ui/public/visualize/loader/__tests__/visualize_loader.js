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

import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { setupAndTeardownInjectorStub } from 'test_utils/stub_get_active_injector';

import FixturesStubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

import { VisProvider } from '../../../vis';
import { getVisualizeLoader } from '../visualize_loader';
import { EmbeddedVisualizeHandler } from '../embedded_visualize_handler';
import { Inspector } from '../../../inspector/inspector';
import { dispatchRenderComplete } from '../../../render_complete';
import { VisualizeDataLoader } from '../visualize_data_loader';
import { PersistedState } from '../../../persisted_state';

describe('visualize loader', () => {

  let searchSource;
  let vis;
  let $rootScope;
  let loader;
  let mockedSavedObject;
  let sandbox;

  function createSavedObject() {
    return {
      vis,
      searchSource,
    };
  }

  async function timeout(delay = 0) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  function newContainer() {
    return angular.element('<div></div>');
  }

  function embedWithParams(params) {
    const container = newContainer();
    loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), params);
    $rootScope.$digest();
    return container.find('[data-test-subj="visualizationLoader"]');
  }

  beforeEach(ngMock.module('kibana', 'kibana/directive'));
  beforeEach(ngMock.inject((_$rootScope_, savedVisualizations, Private) => {
    $rootScope = _$rootScope_;
    searchSource = Private(FixturesStubbedSearchSourceProvider);
    const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);


    // Create a new Vis object
    const Vis = Private(VisProvider);
    vis = new Vis(indexPattern, {
      type: 'pie',
      params: {},
      aggs: [
        { type: 'count', schema: 'metric' },
        {
          type: 'range',
          schema: 'bucket',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 }
            ]
          }
        }
      ]
    });
    vis.type.requestHandler = 'none';
    vis.type.responseHandler = 'none';
    vis.type.requiresSearch = false;

    // Setup savedObject
    mockedSavedObject = createSavedObject();

    sandbox = sinon.sandbox.create();
    // Mock savedVisualizations.get to return 'mockedSavedObject' when id is 'exists'
    sandbox.stub(savedVisualizations, 'get').callsFake((id) =>
      id === 'exists' ? Promise.resolve(mockedSavedObject) : Promise.reject()
    );
  }));
  setupAndTeardownInjectorStub();
  beforeEach(async () => {
    loader = await getVisualizeLoader();
  });

  afterEach(() => {
    if (sandbox) {
      sandbox.restore();
    }
  });

  describe('getVisualizeLoader', () => {

    it('should return a promise', () => {
      expect(getVisualizeLoader().then).to.be.a('function');
    });

    it('should resolve to an object', async () => {
      const visualizeLoader = await getVisualizeLoader();
      expect(visualizeLoader).to.be.an('object');
    });

  });

  describe('service', () => {

    describe('getVisualizationList', () => {

      it('should be a function', async () => {
        expect(loader.getVisualizationList).to.be.a('function');
      });

    });

    describe('embedVisualizationWithSavedObject', () => {

      it('should be a function', () => {
        expect(loader.embedVisualizationWithSavedObject).to.be.a('function');
      });

      it('should render the visualize element', () => {
        const container = newContainer();
        loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), { });
        expect(container.find('[data-test-subj="visualizationLoader"]').length).to.be(1);
      });

      it('should replace content of container by default', () => {
        const container = angular.element('<div><div id="prevContent"></div></div>');
        loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        expect(container.find('#prevContent').length).to.be(0);
      });

      it('should append content to container when using append parameter', () => {
        const container = angular.element('<div><div id="prevContent"></div></div>');
        loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {
          append: true
        });
        expect(container.children().length).to.be(2);
        expect(container.find('#prevContent').length).to.be(1);
      });

      it('should apply css classes from parameters', () => {
        const vis = embedWithParams({ cssClass: 'my-css-class another-class' });
        expect(vis.hasClass('my-css-class')).to.be(true);
        expect(vis.hasClass('another-class')).to.be(true);
      });

      it('should apply data attributes from dataAttrs parameter', () => {
        const vis = embedWithParams({
          dataAttrs: {
            'foo': '',
            'with-dash': 'value',
          }
        });
        expect(vis.attr('data-foo')).to.be('');
        expect(vis.attr('data-with-dash')).to.be('value');
      });

      it('should hide spy panel control by default', () => {
        const vis = embedWithParams({});
        expect(vis.find('[data-test-subj="spyToggleButton"]').length).to.be(0);
      });

    });

    describe('embedVisualizationWithId', () => {

      it('should be a function', async () => {
        expect(loader.embedVisualizationWithId).to.be.a('function');
      });

      it('should reject if the id was not found', () => {
        const resolveSpy = sinon.spy();
        const rejectSpy = sinon.spy();
        const container = newContainer();
        return loader.embedVisualizationWithId(container[0], 'not-existing', {})
          .then(resolveSpy, rejectSpy)
          .then(() => {
            expect(resolveSpy.called).to.be(false);
            expect(rejectSpy.calledOnce).to.be(true);
          });
      });

      it('should render a visualize element, if id was found', async () => {
        const container = newContainer();
        await loader.embedVisualizationWithId(container[0], 'exists', {});
        expect(container.find('[data-test-subj="visualizationLoader"]').length).to.be(1);
      });

    });

    describe('EmbeddedVisualizeHandler', () => {
      it('should be returned from embedVisualizationWithId via a promise', async () => {
        const handler = await loader.embedVisualizationWithId(newContainer()[0], 'exists', {});
        expect(handler instanceof EmbeddedVisualizeHandler).to.be(true);
      });

      it('should be returned from embedVisualizationWithSavedObject', async () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
        expect(handler instanceof EmbeddedVisualizeHandler).to.be(true);
      });

      it('should give access to the visualize element', () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        expect(handler.getElement()).to.be(container.find('[data-test-subj="visualizationLoader"]')[0]);
      });

      it('should allow opening the inspector of the visualization and return its session', () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
        sandbox.spy(Inspector, 'open');
        const inspectorSession = handler.openInspector();
        expect(Inspector.open.calledOnce).to.be(true);
        expect(inspectorSession.close).to.be.a('function');
        inspectorSession.close();
      });

      it('should have whenFirstRenderComplete returns a promise resolving on first renderComplete event', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.whenFirstRenderComplete().then(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        await timeout();
        expect(spy.calledOnce).to.be(true);
      });

      it('should add listeners via addRenderCompleteListener that triggers on renderComplete events', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        await timeout();
        expect(spy.calledOnce).to.be(true);
      });

      it('should call render complete listeners once per renderComplete event', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        expect(spy.callCount).to.be(3);
      });

      it('should successfully remove listeners from render complete', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        expect(spy.calledOnce).to.be(true);
        spy.resetHistory();
        handler.removeRenderCompleteListener(spy);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        expect(spy.notCalled).to.be(true);
      });


      it('should allow updating and deleting data attributes', () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {
          dataAttrs: {
            foo: 42
          }
        });
        expect(container.find('[data-test-subj="visualizationLoader"]').attr('data-foo')).to.be('42');
        handler.update({
          dataAttrs: {
            foo: null,
            added: 'value',
          }
        });
        expect(container.find('[data-test-subj="visualizationLoader"]')[0].hasAttribute('data-foo')).to.be(false);
        expect(container.find('[data-test-subj="visualizationLoader"]').attr('data-added')).to.be('value');
      });

      it('should allow updating the time range of the visualization', async () => {
        const spy = sandbox.spy(VisualizeDataLoader.prototype, 'fetch');

        const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {
          timeRange: { from: 'now-7d', to: 'now' }
        });

        // Wait for the initial fetch and render to happen
        await timeout(150);
        spy.resetHistory();

        handler.update({
          timeRange: { from: 'now-10d/d', to: 'now' }
        });

        // Wait for fetch debounce to happen (as soon as we use lodash 4+ we could use fake timers here for the debounce)
        await timeout(150);

        sinon.assert.calledOnce(spy);
        sinon.assert.calledWith(spy, sinon.match({ timeRange: { from: 'now-10d/d', to: 'now' } }));
      });

      it('should not set forceFetch on uiState change', async () => {
        const spy = sandbox.spy(VisualizeDataLoader.prototype, 'fetch');

        const uiState = new PersistedState();
        loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {
          timeRange: { from: 'now-7d', to: 'now' },
          uiState: uiState,
        });

        // Wait for the initial fetch and render to happen
        await timeout(150);
        spy.resetHistory();

        uiState.set('property', 'value');

        // Wait for fetch debounce to happen (as soon as we use lodash 4+ we could use fake timers here for the debounce)
        await timeout(150);

        sinon.assert.calledOnce(spy);
        sinon.assert.calledWith(spy, sinon.match({ forceFetch: false }));
      });
    });

  });
});
