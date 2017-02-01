import expect from 'expect.js';
import { encode as encodeRison } from 'rison-node';

import {
  createStateHash,
  isStateHash,
} from '../state_hash';

describe('stateHash', () => {
  const existingJsonProvider = () => null;

  describe('#createStateHash', () => {

    describe('returns a hash', () => {
      const json = JSON.stringify({ a: 'a' });
      const hash = createStateHash(json, existingJsonProvider);
      expect(isStateHash(hash)).to.be(true);
    });

    describe('returns the same hash for the same input', () => {
      const json = JSON.stringify({ a: 'a' });
      const hash1 = createStateHash(json, existingJsonProvider);
      const hash2 = createStateHash(json, existingJsonProvider);
      expect(hash1).to.equal(hash2);
    });

    describe('returns a different hash for different input', () => {
      const json1 = JSON.stringify({ a: 'a' });
      const hash1 = createStateHash(json1, existingJsonProvider);

      const json2 = JSON.stringify({ a: 'b' });
      const hash2 = createStateHash(json2, existingJsonProvider);
      expect(hash1).to.not.equal(hash2);
    });
  });

  describe('#isStateHash', () => {
    it('returns true for values created using #createStateHash', () => {
      const json = JSON.stringify({ a: 'a' });
      const hash = createStateHash(json, existingJsonProvider);
      expect(isStateHash(hash)).to.be(true);
    });

    it('returns false for values not created using #createStateHash', () => {
      const json = JSON.stringify({ a: 'a' });
      expect(isStateHash(json)).to.be(false);
    });

    it('returns false for RISON', () => {
      // We're storing RISON in the URL, so let's test against this specifically.
      const rison = encodeRison({ a: 'a' });
      expect(isStateHash(rison)).to.be(false);
    });
  });
});
