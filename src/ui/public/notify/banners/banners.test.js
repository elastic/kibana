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
        banners.add({ id: 'bruce-banner' });
        expect(onChangeSpy.callCount).toBe(1);
      });

      test('callback is called when a banner is removed', () => {
        const onChangeSpy = sinon.spy();
        banners.onChange(onChangeSpy);
        banners.add({ id: 'bruce-banner' });
        banners.remove('bruce-banner');
        expect(onChangeSpy.callCount).toBe(2);
      });

      test('callback is not called when remove is ignored', () => {
        const onChangeSpy = sinon.spy();
        banners.onChange(onChangeSpy);
        banners.remove('hulk'); // should not invoke callback
        expect(onChangeSpy.callCount).toBe(0);
      });

    });

    describe('add method', () => {

      test('adds a banner', () => {
        const id = banners.add({});
        expect(banners.list.length).toBe(1);
        expect(id).to.match(/banner-\d+/);
      });

      test('adds a banner with an ID property', () => {
        const id = banners.add({ id: 'bruce-banner' });
        expect(banners.list[0].id).toBe('bruce-banner');
        expect(id).toBe('bruce-banner');
      });

      test('sorts banners based on priority', () => {
        banners.add({ id: 'test0' });
        // the fact that it was set explicitly is irrelevant; that it was added second means it should be after test0
        banners.add({ id: 'test0explicit', priority: 0 });
        banners.add({ id: 'test1', priority: 1 });
        banners.add({ id: 'test-1', priority: -1 });
        banners.add({ id: 'test1000', priority: 1000 });

        expect(banners.list.length).toBe(5);
        expect(banners.list[0].id).toBe('test1000');
        expect(banners.list[1].id).toBe('test1');
        expect(banners.list[2].id).toBe('test0');
        expect(banners.list[3].id).toBe('test0explicit');
        expect(banners.list[4].id).toBe('test-1');
      });

      test('replaces a banner with the same ID property', () => {
        banners.add({ id: 'test0' });
        banners.add({ id: 'test0explicit', priority: 0 });
        banners.add({ id: 'test1', priority: 1, component: 'old' });
        banners.add({ id: 'test-1', priority: -1 });
        banners.add({ id: 'test1000', priority: 1000, component: 'old' });

        // change one with the same priority
        banners.add({ id: 'test1', priority: 1, component: 'new' });
        // change one with a different priority
        banners.add({ id: 'test1000', priority: 1, component: 'new' });

        expect(banners.list.length).toBe(5);
        expect(banners.list[0].id).toBe('test1');
        expect(banners.list[0].component).toBe('new');
        expect(banners.list[1].id).toBe('test1000'); // priority became 1, so it goes after the other "1"
        expect(banners.list[1].component).toBe('new');
        expect(banners.list[2].id).toBe('test0');
        expect(banners.list[3].id).toBe('test0explicit');
        expect(banners.list[4].id).toBe('test-1');
      });

    });

    describe('remove method', () => {

      test('removes a banner', () => {
        banners.add({ id: 'bruce-banner' });
        banners.remove('bruce-banner');
        expect(banners.list.length).toBe(0);
      });

      test('ignores unknown id', () => {
        banners.add({ id: 'bruce-banner' });
        banners.remove('hulk');
        expect(banners.list.length).toBe(1);
      });

    });

  });
});
