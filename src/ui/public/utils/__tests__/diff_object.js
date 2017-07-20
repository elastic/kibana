import expect from 'expect.js';
import _ from 'lodash';
import { applyDiff } from 'ui/utils/diff_object';

describe('ui/utils/diff_object', function () {

  it('should list the removed keys', function () {
    const target = { test: 'foo' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('removed');
    expect(results.removed).to.eql(['test']);
  });

  it('should list the changed keys', function () {
    const target = { foo: 'bar' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('changed');
    expect(results.changed).to.eql(['foo']);
  });

  it('should list the added keys', function () {
    const target = { };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('added');
    expect(results.added).to.eql(['foo']);
  });

  it('should list all the keys that are change or removed', function () {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('keys');
    expect(results.keys).to.eql(['foo', 'test']);
  });

  it('should ignore functions', function () {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', fn: _.noop };
    applyDiff(target, source);
    expect(target).to.not.have.property('fn');
  });

  it('should ignore underscores', function () {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', _private: 'foo' };
    applyDiff(target, source);
    expect(target).to.not.have.property('_private');
  });

  it('should ignore dollar signs', function () {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', $private: 'foo' };
    applyDiff(target, source);
    expect(target).to.not.have.property('$private');
  });

  it('should not list any changes for similar objects', function () {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'bar', test: 'foo', $private: 'foo' };
    const results = applyDiff(target, source);
    expect(results.changed).to.be.empty();
  });

  it('should only change keys that actually changed', function () {
    const obj = { 'message': 'foo' };
    const target = { obj: obj, message: 'foo' };
    const source = { obj: _.cloneDeep(obj), message: 'test' };
    applyDiff(target, source);
    expect(target.obj).to.be(obj);
  });

});
