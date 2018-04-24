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
    sinon.stub(savedVisualizations, 'get', (id) =>
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
        spy.reset();
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
    });

  });
});
