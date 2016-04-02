import ngMock from 'ng_mock';
import expect from 'expect.js';
import { pluck } from 'lodash';
import sinon from 'sinon';
import KbnTopNavControllerProvider from '../kbn_top_nav_controller';

describe('KbnTopNavController', function () {
  let KbnTopNavController;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    KbnTopNavController = Private(KbnTopNavControllerProvider);
  }));

  describe('opts', function () {
    it('supports giving it no options', function () {
      const controller = new KbnTopNavController();
    });

    it('support empty options list', function () {
      const controller = new KbnTopNavController([]);
    });

    describe('key:', function () {
      it('requires every opt to have a key', function () {
        expect(function () {
          const controller = new KbnTopNavController([
            { foo: 'bar' }
          ]);
        }).to.throwError(TypeError);
      });
    });

    describe('label:', function () {
      it('gives each menu item a label based on the key', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: 'Bar' },
          { key: '1234' },
        ]);

        expect(pluck(controller.opts, 'label')).to.eql([
          'Foo',
          'Bar',
          '1234',
        ]);
      });
    });

    describe('description:', function () {
      it('defaults to "Toggle ${key} view" when using templates', function () {
        const controller = new KbnTopNavController([
          { key: 'foo', template: '<h1></h1>'},
          { key: 'Bar', description: 'not the default' },
          { key: '1234', run: ()=>{} },
        ]);

        expect(pluck(controller.opts, 'description')).to.eql([
          'Toggle foo view',
          'not the default',
          '1234',
        ]);
      });
    });

    describe('hideButton:', function () {
      it('defaults to false', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: '1234' },
        ]);

        expect(pluck(controller.opts, 'hideButton')).to.eql([
          false,
          false
        ]);
      });

      it('excludes opts from opts when true', function () {
        const controller = new KbnTopNavController([
          { key: 'foo' },
          { key: '1234', hideButton: true },
        ]);

        expect(controller.menuItems).to.have.length(1);
      });
    });

    describe('run:', function () {
      it('defaults to a function that toggles the key', function () {
        const controller = new KbnTopNavController([
          { key: 'foo', template: 'Hi' }
        ]);

        const opt = controller.opts[0];
        expect(opt.run).to.be.a('function');
        expect(controller.which()).to.not.be(opt.key);
        opt.run(opt);
        expect(controller.which()).to.be(opt.key);
        opt.run(opt);
        expect(controller.which()).to.not.be(opt.key);
      });

      it('uses the supplied run function otherwise', function (done) { // eslint-disable-line mocha/handle-done-callback
        const controller = new KbnTopNavController([
          { key: 'foo', run: done }
        ]);

        const opt = controller.opts[0];
        opt.run();
      });
    });
  });

  describe('', function () {
    const init = function () {
      const controller = new KbnTopNavController([
        { key: 'foo', template: 'Say Foo!' },
        { key: 'bar', template: 'Whisper Bar' },
      ]);
      const render = sinon.spy(controller, '_render');
      const set = sinon.spy(controller, 'set');
      const is = sinon.spy(controller, 'is');

      return { controller, render, set };
    };

    describe('#set([key])', function () {
      it('assigns the passed key to the current key', function () {
        const { controller } = init();
        expect(controller.which()).to.not.be('foo');
        controller.set('foo');
        expect(controller.which()).to.be('foo');
      });

      it('throws if the key does not match a known template', function () {
        const { controller } = init();
        expect(function () {
          controller.set('june');
        }).to.throwError(/unknown template key/);
      });

      it('sets to "null" for falsy values', function () {
        const { controller } = init();

        controller.set();
        expect(controller.which()).to.be(null);

        controller.set(false);
        expect(controller.which()).to.be(null);

        controller.set(null);
        expect(controller.which()).to.be(null);

        controller.set('');
        expect(controller.which()).to.be(null);
      });

      it('rerenders after setting', function () {
        const { controller, render } = init();

        sinon.assert.notCalled(render);
        controller.set('bar');
        sinon.assert.calledOnce(render);
        controller.set('bar');
        sinon.assert.calledTwice(render);
      });
    });

    describe('#is(key)', function () {
      it('returns true when key matches', function () {
        const { controller } = init();

        controller.set('foo');
        expect(controller.is('foo')).to.be(true);
        expect(controller.is('bar')).to.be(false);

        controller.set('bar');
        expect(controller.is('bar')).to.be(true);
        expect(controller.is('foo')).to.be(false);
      });
    });

    describe('#open(key)', function () {
      it('alias for set', function () {
        const { controller, set } = init();

        controller.open('foo');
        sinon.assert.calledOnce(set);
        sinon.assert.calledWithExactly(set, 'foo');
      });
    });

    describe('#close()', function () {
      it('set the current key to null', function () {
        const { controller } = init();

        controller.open('foo');
        controller.close();
        expect(controller.which()).to.be(null);
      });
    });

    describe('#close(key)', function () {
      it('sets to null if key is open', function () {
        const { controller } = init();

        expect(controller.which()).to.be(null);
        controller.close('foo');
        expect(controller.which()).to.be(null);
        controller.open('foo');
        expect(controller.which()).to.be('foo');
        controller.close('foo');
        expect(controller.which()).to.be(null);
      });

      it('ignores if other key is open', function () {
        const { controller } = init();

        expect(controller.which()).to.be(null);
        controller.open('foo');
        expect(controller.which()).to.be('foo');
        controller.close('bar');
        expect(controller.which()).to.be('foo');
      });
    });

    describe('#toggle()', function () {
      it('opens if closed', function () {
        const { controller } = init();

        expect(controller.which()).to.be(null);
        controller.toggle('foo');
        expect(controller.which()).to.be('foo');
      });

      it('opens if other is open', function () {
        const { controller } = init();

        controller.open('bar');
        expect(controller.which()).to.be('bar');
        controller.toggle('foo');
        expect(controller.which()).to.be('foo');
      });

      it('closes if open', function () {
        const { controller } = init();

        controller.open('bar');
        expect(controller.which()).to.be('bar');
        controller.toggle('bar');
        expect(controller.which()).to.be(null);
      });
    });
  });
});
