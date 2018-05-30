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
import { getVisualizeLoader } from '../loader';
import { EmbeddedVisualizeHandler } from '../embedded_visualize_handler';
import { Inspector } from '../../../inspector/inspector';

describe('visualize loader', () => {

  let searchSource;
  let vis;
  let $rootScope;
  let loader;
  let mockedSavedObject;

  function createSavedObject() {
    return {
      vis: vis,
      searchSource: searchSource
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
    loader.embedVisualizationWithSavedObject(container, createSavedObject(), params);
    $rootScope.$digest();
    return container.find('visualize');
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
    // Mock savedVisualizations.get to return 'mockedSavedObject' when id is 'exists'
    sinon.stub(savedVisualizations, 'get').callsFake((id) =>
      id === 'exists' ? Promise.resolve(mockedSavedObject) : Promise.reject()
    );
  }));
  setupAndTeardownInjectorStub();
  beforeEach(async () => {
    loader = await getVisualizeLoader();
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
        loader.embedVisualizationWithSavedObject(container, createSavedObject(), { });
        expect(container.find('visualize').length).to.be(1);
      });

      it('should replace content of container by default', () => {
        const container = angular.element('<div><div id="prevContent"></div></div>');
        loader.embedVisualizationWithSavedObject(container, createSavedObject(), {});
        expect(container.find('#prevContent').length).to.be(0);
      });

      it('should append content to container when using append parameter', () => {
        const container = angular.element('<div><div id="prevContent"></div></div>');
        loader.embedVisualizationWithSavedObject(container, createSavedObject(), {
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
        return loader.embedVisualizationWithId(newContainer(), 'not-existing', {})
          .then(resolveSpy, rejectSpy)
          .then(() => {
            expect(resolveSpy.called).to.be(false);
            expect(rejectSpy.calledOnce).to.be(true);
          });
      });

      it('should render a visualize element, if id was found', async () => {
        const container = newContainer();
        await loader.embedVisualizationWithId(container, 'exists', {});
        expect(container.find('visualize').length).to.be(1);
      });

    });

    describe('EmbeddedVisualizeHandler', () => {
      it('should be returned from embedVisualizationWithId via a promise', async () => {
        const handler = await loader.embedVisualizationWithId(newContainer(), 'exists', {});
        expect(handler instanceof EmbeddedVisualizeHandler).to.be(true);
      });

      it('should be returned from embedVisualizationWithSavedObject', async () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer(), createSavedObject(), {});
        expect(handler instanceof EmbeddedVisualizeHandler).to.be(true);
      });

      it('should give access to the visualzie element', () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container, createSavedObject(), {});
        expect(handler.getElement()[0]).to.be(container.find('visualize')[0]);
      });

      it('should use a jquery wrapper for handler.element', () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer(), createSavedObject(), {});
        // Every jquery wrapper has a .jquery property with the version number
        expect(handler.getElement().jquery).to.be.ok();
      });

      it('should allow opening the inspector of the visualization and return its session', () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer(), createSavedObject(), {});
        sinon.spy(Inspector, 'open');
        const inspectorSession = handler.openInspector();
        expect(Inspector.open.calledOnce).to.be(true);
        expect(inspectorSession.close).to.be.a('function');
        inspectorSession.close();
      });

      it('should have whenFirstRenderComplete returns a promise resolving on first renderComplete event', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container, createSavedObject(), {});
        const spy = sinon.spy();
        handler.whenFirstRenderComplete().then(spy);
        expect(spy.notCalled).to.be(true);
        container.find('visualize').trigger('renderComplete');
        await timeout();
        expect(spy.calledOnce).to.be(true);
      });

      it('should add listeners via addRenderCompleteListener that triggers on renderComplete events', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container, createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        container.find('visualize').trigger('renderComplete');
        await timeout();
        expect(spy.calledOnce).to.be(true);
      });

      it('should call render complete listeners once per renderComplete event', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container, createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        container.find('visualize').trigger('renderComplete');
        container.find('visualize').trigger('renderComplete');
        container.find('visualize').trigger('renderComplete');
        expect(spy.callCount).to.be(3);
      });

      it('should successfully remove listeners from render complete', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container, createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        container.find('visualize').trigger('renderComplete');
        expect(spy.calledOnce).to.be(true);
        spy.resetHistory();
        handler.removeRenderCompleteListener(spy);
        container.find('visualize').trigger('renderComplete');
        expect(spy.notCalled).to.be(true);
      });

      it('should call render complete listener also for native DOM events', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container, createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        const event = new CustomEvent('renderComplete', { bubbles: true });
        container.find('visualize')[0].dispatchEvent(event);
        await timeout();
        expect(spy.calledOnce).to.be(true);
      });

      it('should allow updating and deleting data attributes', () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container, createSavedObject(), {
          dataAttrs: {
            foo: 42
          }
        });
        expect(container.find('visualize').attr('data-foo')).to.be('42');
        handler.update({
          dataAttrs: {
            foo: null,
            added: 'value',
          }
        });
        // Synce we are relying on $evalAsync we need to trigger a digest loop during tests
        $rootScope.$digest();
        expect(container.find('visualize')[0].hasAttribute('data-foo')).to.be(false);
        expect(container.find('visualize').attr('data-added')).to.be('value');
      });

      it('should allow updating the time range of the visualization', () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer(), createSavedObject(), {
          timeRange: { from: 'now-7d', to: 'now' }
        });
        handler.update({
          timeRange: { from: 'now-10d/d', to: 'now' }
        });
        // Synce we are relying on $evalAsync we need to trigger a digest loop during tests
        $rootScope.$digest();
        // This is not the best test, since it tests internal structure of our scope.
        // Unfortunately we currently don't expose the timeRange in a better way.
        // Once we rewrite this to a react component we should spy on the timeRange
        // property in the component to match the passed in value.
        expect(handler._scope.timeRange).to.eql({ from: 'now-10d/d', to: 'now' });
      });
    });

  });
});
