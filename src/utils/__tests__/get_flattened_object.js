import expect from 'expect.js';

import { getFlattenedObject } from '../get_flattened_object';

describe('getFlattenedObject()', () => {
  describe('defaults', () => {
    it('throws when rootValue is not an object or array', () => {
      expect(() => getFlattenedObject(1)).to.throwError('number');
      expect(() => getFlattenedObject(Infinity)).to.throwError('number');
      expect(() => getFlattenedObject(NaN)).to.throwError('number');
      expect(() => getFlattenedObject(false)).to.throwError('boolean');
      expect(() => getFlattenedObject(null)).to.throwError('null');
      expect(() => getFlattenedObject(undefined)).to.throwError('undefined');
    });

    it('flattens objects', () => {
      expect(getFlattenedObject({ a: 'b' })).to.eql({ a: 'b' });
      expect(getFlattenedObject({ a: { b: 'c' } })).to.eql({ 'a.b': 'c' });
      expect(getFlattenedObject({ a: { b: 'c' }, d: { e: 'f' } })).to.eql({ 'a.b': 'c', 'd.e': 'f' });
    });

    it('flattens arrays', () => {
      expect(getFlattenedObject({ a: ['b'] })).to.eql({ 'a.0': 'b' });
      expect(getFlattenedObject({ a: { b: ['c', 'd'] } })).to.eql({ 'a.b.0': 'c', 'a.b.1': 'd' });
    });
  });

  describe('traverseArrays = false', () => {
    const options = {
      traverseArrays: false
    };

    it('throws when rootValue is not an object or is an array', () => {
      expect(() => getFlattenedObject(1, options)).to.throwError('number');
      expect(() => getFlattenedObject(Infinity, options)).to.throwError('number');
      expect(() => getFlattenedObject(NaN, options)).to.throwError('number');
      expect(() => getFlattenedObject(false, options)).to.throwError('boolean');
      expect(() => getFlattenedObject(null, options)).to.throwError('null');
      expect(() => getFlattenedObject(undefined, options)).to.throwError('undefined');
      expect(() => getFlattenedObject([], options)).to.throwError('array');
    });

    it('flattens objects', () => {
      expect(getFlattenedObject({ a: 'b' }, options)).to.eql({ a: 'b' });
      expect(getFlattenedObject({ a: { b: 'c' } }, options)).to.eql({ 'a.b': 'c' });
      expect(getFlattenedObject({ a: { b: 'c' }, d: { e: 'f' } }, options)).to.eql({ 'a.b': 'c', 'd.e': 'f' });
    });

    it('does not flatten arrays', () => {
      expect(getFlattenedObject({ a: ['b'] }, options)).to.eql({ a: ['b'] });
      expect(getFlattenedObject({ a: { b: ['c', 'd'] } }, options)).to.eql({ 'a.b': ['c', 'd'] });
    });
  });
});
