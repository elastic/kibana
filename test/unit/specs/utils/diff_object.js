define(function (require) {
  var diff = require('utils/diff_object');
  var _ = require('lodash');

  describe('utils/diff_object', function () {

    it('should list the removed keys', function () {
      var target = { test: 'foo' };
      var source = { foo: 'test' };
      var results = diff(target, source);
      expect(results).to.have.property('removed');
      expect(results.removed).to.eql(['test']);
    });

    it('should list the changed keys', function () {
      var target = { foo: 'bar' };
      var source = { foo: 'test' };
      var results = diff(target, source);
      expect(results).to.have.property('changed');
      expect(results.changed).to.eql(['foo']);
    });

    it('should list the added keys', function () {
      var target = { };
      var source = { foo: 'test' };
      var results = diff(target, source);
      expect(results).to.have.property('added');
      expect(results.added).to.eql(['foo']);
    });

    it('should list all the keys that are change or removed', function () {
      var target = { foo: 'bar', test: 'foo' };
      var source = { foo: 'test' };
      var results = diff(target, source);
      expect(results).to.have.property('keys');
      expect(results.keys).to.eql(['foo', 'test']);
    });

    it('should ignore functions', function () {
      var target = { foo: 'bar', test: 'foo' };
      var source = { foo: 'test', fn: _.noop };
      diff(target, source);
      expect(target).to.not.have.property('fn');
    });

    it('should ignore underscores', function () {
      var target = { foo: 'bar', test: 'foo' };
      var source = { foo: 'test', _private: 'foo' };
      diff(target, source);
      expect(target).to.not.have.property('_private');
    });

  });
});
