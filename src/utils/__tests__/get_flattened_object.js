import expect from 'expect.js';

import { getFlattenedObject } from '../get_flattened_object';

describe('getFlattenedObject()', () => {
  it('throws when rootValue is not an object or is an array', () => {
    expect(() => getFlattenedObject(1)).to.throwError('number');
    expect(() => getFlattenedObject(Infinity)).to.throwError('number');
    expect(() => getFlattenedObject(NaN)).to.throwError('number');
    expect(() => getFlattenedObject(false)).to.throwError('boolean');
    expect(() => getFlattenedObject(null)).to.throwError('null');
    expect(() => getFlattenedObject(undefined)).to.throwError('undefined');
    expect(() => getFlattenedObject([])).to.throwError('array');
  });

  it('flattens objects', () => {
    expect(getFlattenedObject({ a: 'b' })).to.eql({ a: 'b' });
    expect(getFlattenedObject({ a: { b: 'c' } })).to.eql({ 'a.b': 'c' });
    expect(getFlattenedObject({ a: { b: 'c' }, d: { e: 'f' } })).to.eql({ 'a.b': 'c', 'd.e': 'f' });
  });

  it('does not flatten arrays', () => {
    expect(getFlattenedObject({ a: ['b'] })).to.eql({ a: ['b'] });
    expect(getFlattenedObject({ a: { b: ['c', 'd'] } })).to.eql({ 'a.b': ['c', 'd'] });
  });
});
