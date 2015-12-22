const _ = require('lodash');
const ngMock = require('ngMock');
const expect = require('expect.js');

let mappingSetup;

describe('ui/utils/mapping_setup', function () {
  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    mappingSetup = Private(require('ui/utils/mapping_setup'));
  }));

  describe('#expandShorthand()', function () {
    it('allows shortcuts for field types by just setting the value to the type name', function () {
      const mapping = mappingSetup.expandShorthand({ foo: 'boolean' });
      expect(mapping.foo.type).to.be('boolean');
    });

    it('can set type as an option', function () {
      const mapping = mappingSetup.expandShorthand({ foo: {type: 'integer'} });
      expect(mapping.foo.type).to.be('integer');
    });

    context('when type is json', function () {
      it('returned object is type string', function () {
        const mapping = mappingSetup.expandShorthand({ foo: 'json' });
        expect(mapping.foo.type).to.be('string');
      });

      it('returned object has _serialize function', function () {
        const mapping = mappingSetup.expandShorthand({ foo: 'json' });
        expect(_.isFunction(mapping.foo._serialize)).to.be(true);
      });

      it('returned object has _deserialize function', function () {
        const mapping = mappingSetup.expandShorthand({ foo: 'json' });
        expect(_.isFunction(mapping.foo._serialize)).to.be(true);
      });
    });
  });
});
