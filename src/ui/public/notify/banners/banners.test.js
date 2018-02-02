import sinon from 'sinon';

import {
  Banners,
} from './banners';

describe('Banners', () => {

  describe('interface', () => {
    let banners;

    beforeEach(() => {
      banners = new Banners();
    });

    describe('onChange method', () => {

      test('callback is called when a banner is added', () => {
        const onChangeSpy = sinon.spy();
        banners.onChange(onChangeSpy);
        banners.add({ component: 'bruce-banner' });
        expect(onChangeSpy.callCount).toBe(1);
      });

      test('callback is called when a banner is removed', () => {
        const onChangeSpy = sinon.spy();
        banners.onChange(onChangeSpy);
        banners.remove(banners.add({ component: 'bruce-banner' }));
        expect(onChangeSpy.callCount).toBe(2);
      });

      test('callback is not called when remove is ignored', () => {
        const onChangeSpy = sinon.spy();
        banners.onChange(onChangeSpy);
        banners.remove('hulk'); // should not invoke callback
        expect(onChangeSpy.callCount).toBe(0);
      });

      test('callback is called once when banner is replaced', () => {
        const onChangeSpy = sinon.spy();
        banners.onChange(onChangeSpy);
        const addBannerId = banners.add({ component: 'bruce-banner' });
        banners.set({ id: addBannerId, component: 'hulk' });
        expect(onChangeSpy.callCount).toBe(2);
      });

    });

    describe('add method', () => {

      test('adds a banner', () => {
        const id = banners.add({});
        expect(banners.list.length).toBe(1);
        expect(id).toEqual(expect.stringMatching(/^\d+$/));
      });

      test('adds a banner and ignores an ID property', () => {
        const bannerId = banners.add({ id: 'bruce-banner' });
        expect(banners.list[0].id).toBe(bannerId);
        expect(bannerId).not.toBe('bruce-banner');
      });

      test('sorts banners based on priority', () => {
        const test0 = banners.add({ });
        // the fact that it was set explicitly is irrelevant; that it was added second means it should be after test0
        const test0Explicit = banners.add({ priority: 0 });
        const test1 = banners.add({ priority: 1 });
        const testMinus1 = banners.add({ priority: -1 });
        const test1000 = banners.add({ priority: 1000 });

        expect(banners.list.length).toBe(5);
        expect(banners.list[0].id).toBe(test1000);
        expect(banners.list[1].id).toBe(test1);
        expect(banners.list[2].id).toBe(test0);
        expect(banners.list[3].id).toBe(test0Explicit);
        expect(banners.list[4].id).toBe(testMinus1);
      });

    });

    describe('remove method', () => {

      test('removes a banner', () => {
        const bannerId = banners.add({ component: 'bruce-banner' });
        banners.remove(bannerId);
        expect(banners.list.length).toBe(0);
      });

      test('ignores unknown id', () => {
        banners.add({ component: 'bruce-banner' });
        banners.remove('hulk');
        expect(banners.list.length).toBe(1);
      });

    });

    describe('set method', () => {

      test('replaces banners', () => {
        const addBannerId = banners.add({ component: 'bruce-banner' });
        const setBannerId = banners.set({ id: addBannerId, component: 'hulk' });

        expect(banners.list.length).toBe(1);
        expect(banners.list[0].component).toBe('hulk');
        expect(banners.list[0].id).toBe(setBannerId);
        expect(addBannerId).not.toBe(setBannerId);
      });

      test('ignores unknown id', () => {
        const id = banners.set({ id: 'fake', component: 'hulk' });

        expect(banners.list.length).toBe(1);
        expect(banners.list[0].component).toBe('hulk');
        expect(banners.list[0].id).toBe(id);
      });

      test('replaces a banner with the same ID property', () => {
        const test0 = banners.add({ });
        const test0Explicit = banners.add({ priority: 0 });
        let test1 = banners.add({ priority: 1, component: 'old' });
        const testMinus1 = banners.add({ priority: -1 });
        let test1000 = banners.add({ priority: 1000, component: 'old' });

        // change one with the same priority
        test1 = banners.set({ id: test1, priority: 1, component: 'new' });
        // change one with a different priority
        test1000 = banners.set({ id: test1000, priority: 1, component: 'new' });

        expect(banners.list.length).toBe(5);
        expect(banners.list[0].id).toBe(test1);
        expect(banners.list[0].component).toBe('new');
        expect(banners.list[1].id).toBe(test1000); // priority became 1, so it goes after the other "1"
        expect(banners.list[1].component).toBe('new');
        expect(banners.list[2].id).toBe(test0);
        expect(banners.list[3].id).toBe(test0Explicit);
        expect(banners.list[4].id).toBe(testMinus1);
      });

    });

  });
});
