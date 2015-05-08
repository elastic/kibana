var root = require('requirefrom')('');
var _ = require('lodash');
var checkEsVersion = root('src/hapi/plugins/elasticsearch/lib/check_es_version');
var Promise = require('bluebird');
var sinon = require('sinon');

describe('plugins/elasticsearch', function () {
  describe('lib/check_es_version', function () {
    var server;

    beforeEach(function () {
      var get = sinon.stub().withArgs('elasticserach.minimumVerison').returns('1.4.3');
      var config = function () { return { get: get }; };
      server = { config: config, plugins: { elasticsearch: { client: { nodes: {} } } } };
    });

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

      var client = server.plugins.elasticsearch.client;
      client.nodes.info = sinon.stub().returns(Promise.resolve({ nodes: nodes }));

    }

    it('passes with single a node that matches', function () {
      setNodes('1.4.3');
      return checkEsVersion(server)();
    });

    it('passes with multiple nodes that satisfy', function () {
      setNodes('1.4.3', '1.4.4', '1.4.3-Beta1');
      return checkEsVersion(server)();
    });

    it('fails with a single node that is out of date', function () {
      setNodes('1.4.4', '1.4.2', '1.4.5');
      return checkEsVersion(server)()
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

      return checkEsVersion(server)();
    });

  });
});
