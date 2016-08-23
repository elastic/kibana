import expect from 'expect.js';
import sinon from 'sinon';
import { times, sum, padLeft } from 'lodash';

import StubBrowserStorage from 'test_utils/stub_browser_storage';
import { LazyLruStore } from '..';

const setup = (opts = {}) => {
  const {
    id = 'testLru',
    store = new StubBrowserStorage(),
    maxItems,
    maxSetAttempts,
    idealClearRatio,
    maxIdealClearPercent
  } = opts;

  const lru = new LazyLruStore({
    id,
    store,
    maxItems,
    maxSetAttempts,
    idealClearRatio,
    maxIdealClearPercent
  });

  return { lru, store };
};

describe('State Management LazyLruStore', () => {
  describe('#getItem()', () => {
    it('returns null when item not found', () => {
      const { lru } = setup();
      expect(lru.getItem('item1')).to.be(null);
    });

    it('returns stored value when item found', () => {
      const { lru } = setup();
      lru.setItem('item1', '1');
      expect(lru.getItem('item1')).to.be('1');
    });
  });

  describe('#setItem()', () => {
    it('stores the item in the underlying store', () => {
      const { lru, store } = setup();
      expect(store).to.have.length(0);
      lru.setItem('item1', '1');
      expect(store).to.have.length(1);
    });

    it('makes space for new item when necessary', () => {
      const { lru, store } = setup({ idealClearRatio: 1 });
      store._setSizeLimit(lru.getStorageOverhead() + 6);
      lru.setItem('item1', '1');
      expect(store).to.have.length(1);
      lru.setItem('item2', '2');
      expect(store).to.have.length(1);

      expect(lru.getItem('item1')).to.be(null);
      expect(lru.getItem('item2')).to.be('2');
    });

    it('overwrites existing values', () => {
      const { lru, store } = setup();
      lru.setItem('item1', '1');
      expect(store).to.have.length(1);
      lru.setItem('item1', '2');
      expect(store).to.have.length(1);
      expect(lru.getItem('item1')).to.be('2');
    });

    it('stores items as strings', () => {
      const { lru } = setup();
      lru.setItem('item1', 1);
      expect(lru.getItem('item1')).to.be('1');
    });

    it('bubbles up the error when unable to clear the necessary space', () => {
      const { lru, store } = setup();
      store._setSizeLimit(lru.getStorageOverhead() + 2);
      lru.setItem('1', '1');
      sinon.stub(store, 'removeItem');
      expect(() => {
        lru.setItem('2', '2');
      }).to.throwError(/quota/);
    });
  });

  describe('#removeItem()', () => {
    it('removes items from the underlying store', () => {
      const { lru, store } = setup();
      lru.setItem('item1', '1');
      expect(store).to.have.length(1);
      lru.removeItem('item1');
      expect(store).to.have.length(0);
      expect(lru.getItem('item1')).to.be(null);
    });

    it('ignores unknown items', () => {
      const { lru, store } = setup();
      expect(store).to.have.length(0);
      expect(() => {
        lru.removeItem('item1');
      }).to.not.throwError();
      expect(store).to.have.length(0);
    });
  });

  describe('#getStorageOverhead()', () => {
    it('returns the number of bytes added to each storage item, used for testing', () => {
      const { store } = setup();
      const id1 = new LazyLruStore({ id: '1', store });
      const id11 = new LazyLruStore({ id: '11', store });
      expect(id1.getStorageOverhead()).to.be(id11.getStorageOverhead() - 1);
    });
  });

  describe('space management', () => {
    let clock;
    beforeEach(() => {
      clock = sinon.useFakeTimers(Date.now());
    });

    afterEach(() => {
      clock.restore();
    });

    it('tries to clear space if setItem fails because the quota was exceeded', () => {
      const { lru, store } = setup();
      const itemSize = lru.getStorageOverhead() + 10; // each item key length + val length is 10

      store._setSizeLimit(itemSize * 3);

      lru.setItem('item1', 'item1');
      clock.tick(1); // move clock forward so removal based on time is predictable
      lru.setItem('item2', 'item2');
      clock.tick(1);
      lru.setItem('item3', 'item3');
      clock.tick(1);
      lru.setItem('item4', 'item4');
      clock.tick(1);
      lru.setItem('item5', 'item5');
      clock.tick(1);

      expect(store).to.have.length(3);
      expect(lru.getItem('item1')).to.be(null);
      expect(lru.getItem('item2')).to.be(null);
      expect(lru.getItem('item3')).to.be('item3');
      expect(lru.getItem('item4')).to.be('item4');
      expect(lru.getItem('item5')).to.be('item5');
    });

    context('when small items are being written to a large existing collection', () => {
      context('with idealClearRatio = 6', () => {
        it('clears 6 times the amount of space necessary', () => {
          const { lru, store } = setup({ idealClearRatio: 6 });

          const overhead = lru.getStorageOverhead();
          const getItemSize = i => overhead + `${i.key}${i.value}`.length;

          const items = times(100, i => {
            // pad n so that 1 and 100 take up equal space in the store
            const n = padLeft(i + 1, 3, '0');
            return { key: `key${n}`, value: `value${n}` };
          });
          const lastItem = items[items.length - 1];

          // set the size limit so that the last item causes a cleanup, which
          store._setSizeLimit(sum(items.map(getItemSize)) - getItemSize(lastItem));

          for (const i of items) {
            lru.setItem(i.key, i.value);
            clock.tick(1); // move clock forward so removal based on time is predictable
          }

          // the current ratio is 6:1, so when the last item fails
          // to set, 6 items are cleared to make space for it
          expect(store).to.have.length(94);
          expect(lru.getItem('key001')).to.be(null);
          expect(lru.getItem('key002')).to.be(null);
          expect(lru.getItem('key003')).to.be(null);
          expect(lru.getItem('key004')).to.be(null);
          expect(lru.getItem('key005')).to.be(null);
          expect(lru.getItem('key006')).to.be(null);
          expect(lru.getItem('key007')).to.be('value007');
        });
      });

      context('with idealClearRatio = 100 and maxIdealClearPercent = 0.1', () => {
        it('clears 10% of the store', () => {
          const { lru, store } = setup({ idealClearRatio: 100, maxIdealClearPercent: 0.1 });

          const overhead = lru.getStorageOverhead();
          const getItemSize = i => overhead + `${i.key}${i.value}`.length;

          const items = times(100, i => {
            // pad n so that 1 and 100 take up equal space in the store
            const n = padLeft(i + 1, 3, '0');
            return { key: `key${n}`, value: `value${n}` };
          });
          const lastItem = items[items.length - 1];

          // set the size limit so that the last item causes a cleanup, which
          store._setSizeLimit(sum(items.map(getItemSize)) - getItemSize(lastItem));

          for (const i of items) {
            lru.setItem(i.key, i.value);
            clock.tick(1); // move clock forward so removal based on time is predictable
          }

          // with the ratio set to 100:1 the store will try to clear
          // 100x the stored values, but that could be the entire store
          // so it is limited by the maxIdealClearPercent (10% here)
          // so the store should now contain values 11-100
          expect(store).to.have.length(90);
          expect(lru.getItem('key001')).to.be(null);
          expect(lru.getItem('key002')).to.be(null);
          expect(lru.getItem('key003')).to.be(null);
          expect(lru.getItem('key004')).to.be(null);
          expect(lru.getItem('key005')).to.be(null);
          expect(lru.getItem('key006')).to.be(null);
          expect(lru.getItem('key007')).to.be(null);
          expect(lru.getItem('key008')).to.be(null);
          expect(lru.getItem('key009')).to.be(null);
          expect(lru.getItem('key010')).to.be(null);
          expect(lru.getItem('key011')).to.be('value011');
          expect(lru.getItem('key012')).to.be('value012');
          expect(lru.getItem('key100')).to.be('value100');
        });
      });
    });
  });

  describe('maxSetAttempts setting', () => {
    it('must be >= 1', () => {
      expect(() => setup({ maxSetAttempts: 0 })).to.throwError(TypeError);
      expect(() => setup({ maxSetAttempts: -1 })).to.throwError(TypeError);
      expect(() => setup({ maxSetAttempts: 0.9 })).to.throwError(TypeError);
      expect(() => setup({ maxSetAttempts: 1 })).to.not.throwError(TypeError);
    });

    context('= 1', () => {
      it('will cause sets to a full storage to throw', () => {
        const { lru, store } = setup({ maxSetAttempts: 1 });
        store._setSizeLimit(lru.getStorageOverhead() + 2);
        lru.setItem('1', '1');
        expect(() => {
          lru.setItem('2', '2');
        }).to.throwError(/quota/i);
      });
    });

    context('= 5', () => {
      it('will try to set 5 times and remove 4', () => {
        const { store, lru } = setup({ maxSetAttempts: 5 });

        // trick lru into thinking it can clear space
        lru.setItem('1', '1');
        // but prevent removing items
        const removeStub = sinon.stub(store, 'removeItem');

        // throw on the first 4 set attempts
        const setStub = sinon.stub(store, 'setItem')
          .onCall(0).throws()
          .onCall(1).throws()
          .onCall(2).throws()
          .onCall(3).throws()
          .stub;

        lru.setItem('1', '1');
        sinon.assert.callCount(removeStub, 4);
        sinon.assert.callCount(setStub, 5);
      });
    });
  });

  context('with maxItems set', () => {
    it('trims the list when starting with more than max items', () => {
      const { store, lru: lruNoMax } = setup();
      lruNoMax.setItem('1', '1');
      lruNoMax.setItem('2', '2');
      lruNoMax.setItem('3', '3');
      lruNoMax.setItem('4', '4');
      expect(store).to.have.length(4);

      const { lru } = setup({ store, maxItems: 3 });
      expect(store).to.have.length(3);
    });
  });
});
