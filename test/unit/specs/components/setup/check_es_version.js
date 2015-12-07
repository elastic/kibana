define(function (require) {
  describe('Setup: Check ES Version', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');
    require('test_utils/no_digest_promises').activateForSuite();

    var checkEsVersion;
    var es;
    var Promise;

    beforeEach(module('kibana', function ($provide) {
      // hard coded to prevent failures when we bump the version
      $provide.constant('elasticsearchEngineVersion', '^1.4.3');
    }));

    beforeEach(inject(function (Private, $injector) {
      checkEsVersion = Private(require('components/setup/steps/check_es_version'));
      es = $injector.get('es');
      Promise = $injector.get('Promise');
    }));

    function setNodes(/* ...versions */) {
      var versions = _.shuffle(arguments);
      var nodes = {};
      var i = 0;

      while (versions.length) {
        var name = 'node-' + (++i);
        var version = versions.shift();

        var node = {
          version: version,
          http_address: 'http_address',
          ip: 'ip'
        };

        if (!_.isString(version)) _.assign(node, version);
        nodes[name] = node;
      }

      sinon.stub(es.nodes, 'info').returns(Promise.resolve({
        nodes: nodes
      }));
    }

    it('passes with single a node that matches', function () {
      setNodes('1.4.3');
      return checkEsVersion();
    });

    it('passes with multiple nodes that satisfy', function () {
      setNodes('1.4.3', '1.4.4', '1.4.3-Beta1');
      return checkEsVersion();
    });

    it('fails with a single node that is out of date', function () {
      setNodes('1.4.4', '1.4.2', '1.4.5');
      return checkEsVersion()
      .then(function () {
        throw new Error('expected validation to fail');
      }, _.noop);
    });

    it('passes if that single node is a client node', function () {
      setNodes(
        '1.4.4',
        { version: '1.4.2', attributes: { client: 'true' } },
        '1.4.5'
      );

      return checkEsVersion();
    });

  });
});