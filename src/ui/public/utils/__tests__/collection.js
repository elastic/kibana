import expect from 'expect.js';
import { groupBy } from 'lodash';
import { move, pushAll, organizeBy } from '../collection';

describe('collection', () => {
  describe('move', function () {

    it('accepts previous from->to syntax', function () {
      const list = [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        8,
        1,
        1,
      ];

      expect(list[3]).to.be(1);
      expect(list[8]).to.be(8);

      move(list, 8, 3);

      expect(list[8]).to.be(1);
      expect(list[3]).to.be(8);
    });

    it('moves an object up based on a function callback', function () {
      const list = [
        1,
        1,
        1,
        1,
        0,
        1,
        0,
        1,
        1,
        1,
        1,
      ];

      expect(list[4]).to.be(0);
      expect(list[5]).to.be(1);
      expect(list[6]).to.be(0);

      move(list, 5, false, function (v) {
        return v === 0;
      });

      expect(list[4]).to.be(1);
      expect(list[5]).to.be(0);
      expect(list[6]).to.be(0);
    });

    it('moves an object down based on a function callback', function () {
      const list = [
        1,
        1,
        1,
        1,
        0,
        1,
        0,
        1,
        1,
        1,
        1,
      ];

      expect(list[4]).to.be(0);
      expect(list[5]).to.be(1);
      expect(list[6]).to.be(0);

      move(list, 5, true, function (v) {
        return v === 0;
      });

      expect(list[4]).to.be(0);
      expect(list[5]).to.be(0);
      expect(list[6]).to.be(1);
    });

    it('moves an object up based on a where callback', function () {
      const list = [
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
      ];

      expect(list[4]).to.have.property('v', 0);
      expect(list[5]).to.have.property('v', 1);
      expect(list[6]).to.have.property('v', 0);

      move(list, 5, false, { v: 0 });

      expect(list[4]).to.have.property('v', 1);
      expect(list[5]).to.have.property('v', 0);
      expect(list[6]).to.have.property('v', 0);
    });


    it('moves an object down based on a where callback', function () {
      const list = [
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
      ];

      expect(list[4]).to.have.property('v', 0);
      expect(list[5]).to.have.property('v', 1);
      expect(list[6]).to.have.property('v', 0);

      move(list, 5, true, { v: 0 });

      expect(list[4]).to.have.property('v', 0);
      expect(list[5]).to.have.property('v', 0);
      expect(list[6]).to.have.property('v', 1);
    });

    it('moves an object down based on a pluck callback', function () {
      const list = [
        { id: 0, normal: true },
        { id: 1, normal: true },
        { id: 2, normal: true },
        { id: 3, normal: true },
        { id: 4, normal: true },
        { id: 5, normal: false },
        { id: 6, normal: true },
        { id: 7, normal: true },
        { id: 8, normal: true },
        { id: 9, normal: true }
      ];

      expect(list[4]).to.have.property('id', 4);
      expect(list[5]).to.have.property('id', 5);
      expect(list[6]).to.have.property('id', 6);

      move(list, 5, true, 'normal');

      expect(list[4]).to.have.property('id', 4);
      expect(list[5]).to.have.property('id', 6);
      expect(list[6]).to.have.property('id', 5);
    });
  });

  describe('pushAll', function () {
    it('pushes an entire array into another', function () {
      const a = [1, 2, 3, 4];
      const b = [5, 6, 7, 8];

      const output = pushAll(b, a);
      expect(output).to.be(a);
      expect(a).to.eql([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(b).to.eql([5, 6, 7, 8]);
    });
  });

  describe('organizeBy', function () {

    it('it works', function () {
      const col = [
        {
          name: 'one',
          roles: ['user', 'admin', 'owner']
        },
        {
          name: 'two',
          roles: ['user']
        },
        {
          name: 'three',
          roles: ['user']
        },
        {
          name: 'four',
          roles: ['user', 'admin']
        }
      ];

      const resp = organizeBy(col, 'roles');
      expect(resp).to.have.property('user');
      expect(resp.user).to.have.length(4);

      expect(resp).to.have.property('admin');
      expect(resp.admin).to.have.length(2);

      expect(resp).to.have.property('owner');
      expect(resp.owner).to.have.length(1);
    });

    it('behaves just like groupBy in normal scenarios', function () {
      const col = [
        { name: 'one' },
        { name: 'two' },
        { name: 'three' },
        { name: 'four' }
      ];

      const orgs = organizeBy(col, 'name');
      const groups = groupBy(col, 'name');
      expect(orgs).to.eql(groups);
    });
  });
});
