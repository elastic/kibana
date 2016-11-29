import diff from 'ui/utils/diff_object';
import expect from 'expect.js';
import _ from 'lodash';

describe('ui/utils/diff_object', function () {

  it('should list the removed keys', function () {
    let target = { test: 'foo' };
    let source = { foo: 'test' };
    let results = diff(target, source);
    expect(results).to.have.property('removed');
    expect(results.removed).to.eql(['test']);
  });

  it('should list the changed keys', function () {
    let target = { foo: 'bar' };
    let source = { foo: 'test' };
    let results = diff(target, source);
    expect(results).to.have.property('changed');
    expect(results.changed).to.eql(['foo']);
  });

  it('should list the added keys', function () {
    let target = { };
    let source = { foo: 'test' };
    let results = diff(target, source);
    expect(results).to.have.property('added');
    expect(results.added).to.eql(['foo']);
  });

  it('should list all the keys that are change or removed', function () {
    let target = { foo: 'bar', test: 'foo' };
    let source = { foo: 'test' };
    let results = diff(target, source);
    expect(results).to.have.property('keys');
    expect(results.keys).to.eql(['foo', 'test']);
  });

  it('should ignore functions', function () {
    let target = { foo: 'bar', test: 'foo' };
    let source = { foo: 'test', fn: _.noop };
    diff(target, source);
    expect(target).to.not.have.property('fn');
  });

  it('should ignore underscores', function () {
    let target = { foo: 'bar', test: 'foo' };
    let source = { foo: 'test', _private: 'foo' };
    diff(target, source);
    expect(target).to.not.have.property('_private');
  });

  it('should ignore dollar signs', function () {
    let target = { foo: 'bar', test: 'foo' };
    let source = { foo: 'test', $private: 'foo' };
    diff(target, source);
    expect(target).to.not.have.property('$private');
  });

  it('should not list any changes for similar objects', function () {
    let target = { foo: 'bar', test: 'foo' };
    let source = { foo: 'bar', test: 'foo', $private: 'foo' };
    let results = diff(target, source);
    expect(results.changed).to.be.empty();
  });

  it('should only change keys that actually changed', function () {
    let obj = { 'message': 'foo' };
    let target = { obj: obj, message: 'foo' };
    let source = { obj: _.cloneDeep(obj), message: 'test' };
    let results = diff(target, source);
    expect(target.obj).to.be(obj);
  });

});
