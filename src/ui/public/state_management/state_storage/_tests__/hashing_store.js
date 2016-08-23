import expect from 'expect.js';
import sinon from 'sinon';
import { encode as encodeRison } from 'rison-node';

import StubBrowserStorage from 'test_utils/stub_browser_storage';
import { HashingStore } from 'ui/state_management/state_storage/hashing_store';

const setup = ({ createHash } = {}) => {
  const store = new StubBrowserStorage();
  const hashingStore = new HashingStore({ store, createHash });
  return { store, hashingStore };
};

describe('State Management Hashing Store', () => {
  describe('#add', () => {
    it('adds a value to the store and returns its hash', () => {
      const { hashingStore, store } = setup();
      const val = { foo: 'bar' };
      const hash = hashingStore.add(val);
      expect(hash).to.be.a('string');
      expect(hash).to.be.ok();
      expect(store).to.have.length(1);
    });

    it('json encodes the values it stores', () => {
      const { hashingStore, store } = setup();
      const val = { toJSON() { return 1; } };
      const hash = hashingStore.add(val);
      expect(hashingStore.lookup(hash)).to.eql(1);
    });

    it('addresses values with a short hash', () => {
      const val = { foo: 'bar' };
      const longHash = 'longlonglonglonglonglonglonglonglonglonghash';
      const { hashingStore } = setup({
        createHash: () => longHash
      });

      const hash = hashingStore.add(val);
      expect(hash.length < longHash.length).to.be.ok();
    });

    it('addresses values with a slightly longer hash when short hashes collide', () => {
      const fixtures = [
        {
          hash: '1234567890-1',
          val: { foo: 'bar' }
        },
        {
          hash: '1234567890-2',
          val: { foo: 'baz' }
        },
        {
          hash: '1234567890-3',
          val: { foo: 'boo' }
        }
      ];

      const matchVal = json => f => JSON.stringify(f.val) === json;
      const { hashingStore } = setup({
        createHash: val => {
          const fixture = fixtures.find(matchVal(val));
          return fixture.hash;
        }
      });

      const hash1 = hashingStore.add(fixtures[0].val);
      const hash2 = hashingStore.add(fixtures[1].val);
      const hash3 = hashingStore.add(fixtures[2].val);

      expect(hash3).to.have.length(hash2.length + 1);
      expect(hash2).to.have.length(hash1.length + 1);
    });

    it('bubbles up the error if the store fails to setItem', () => {
      const { store, hashingStore } = setup();
      const err = new Error();
      sinon.stub(store, 'setItem').throws(err);
      expect(() => {
        hashingStore.add({});
      }).to.throwError(e => expect(e).to.be(err));
    });
  });

  describe('#lookup', () => {
    it('reads a value from the store by its hash', () => {
      const { hashingStore } = setup();
      const val = { foo: 'bar' };
      const hash = hashingStore.add(val);
      expect(hashingStore.lookup(hash)).to.eql(val);
    });

    it('returns null when the value is not in the store', () => {
      const { hashingStore } = setup();
      const val = { foo: 'bar' };
      const hash = hashingStore.add(val);
      expect(hashingStore.lookup(`${hash} break`)).to.be(null);
    });
  });

  describe('#remove', () => {
    it('removes the value by its hash', () => {
      const { hashingStore } = setup();
      const val = { foo: 'bar' };
      const hash = hashingStore.add(val);
      expect(hashingStore.lookup(hash)).to.eql(val);
      hashingStore.remove(hash);
      expect(hashingStore.lookup(hash)).to.be(null);
    });
  });

  describe('#isHash', () => {
    it('can identify values that look like hashes', () => {
      const { hashingStore } = setup();
      const val = { foo: 'bar' };
      const hash = hashingStore.add(val);
      expect(hashingStore.isHash(hash)).to.be(true);
    });

    describe('rison', () => {
      const tests = [
        ['object', { foo: 'bar' }],
        ['number', 1],
        ['number', 1000],
        ['number', Math.round(Math.random() * 10000000)],
        ['string', 'this is a string'],
        ['array', [1,2,3]],
      ];

      tests.forEach(([type, val]) => {
        it(`is not fooled by rison ${type} "${val}"`, () => {
          const { hashingStore } = setup();
          const rison = encodeRison(val);
          expect(hashingStore.isHash(rison)).to.be(false);
        });
      });
    });
  });
});
