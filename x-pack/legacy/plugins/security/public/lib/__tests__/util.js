/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { toggle, toggleSort } from '../../../public/lib/util';

describe('util', () => {
  describe('toggle', () => {
    it('should add an item to a collection if not already included', () => {
      const collection = [1, 2, 3, 4, 5];
      toggle(collection, 6);
      expect(collection.indexOf(6)).to.be.above(0);
    });

    it('should remove an item from a collection if already included', () => {
      const collection = [1, 2, 3, 4, 5];
      toggle(collection, 3);
      expect(collection.indexOf(3)).to.be.below(0);
    });
  });

  describe('toggleSort', () => {
    it('should toggle reverse if called with the same orderBy', () => {
      const sort = { orderBy: 'foo', reverse: false };

      toggleSort(sort, 'foo');
      expect(sort.reverse).to.be.true;

      toggleSort(sort, 'foo');
      expect(sort.reverse).to.be.false;
    });

    it('should change orderBy and set reverse to false when called with a different orderBy', () => {
      const sort = { orderBy: 'foo', reverse: false };

      toggleSort(sort, 'bar');
      expect(sort.orderBy).to.equal('bar');
      expect(sort.reverse).to.be.false;

      sort.reverse = true;
      toggleSort(sort, 'foo');
      expect(sort.orderBy).to.equal('foo');
      expect(sort.reverse).to.be.false;
    });
  });
});
