
import _ from 'lodash';
import expect from 'expect.js';
import { IndexedArray } from 'ui/indexed_array';

// this is generally a data-structure that IndexedArray is good for managing
const users = [
  { name: 'John', id: 69, username: 'beast', group: 'admins' },
  { name: 'Anon', id:  0, username: 'shhhh', group: 'secret' },
  { name: 'Fern', id: 42, username: 'kitty', group: 'editor' },
  { name: 'Mary', id: 55, username: 'sheep', group: 'editor' }
];

// this is how we used to accomplish this, before IndexedArray
users.byName = _.indexBy(users, 'name');
users.byUsername = _.indexBy(users, 'username');
users.byGroup = _.groupBy(users, 'group');
users.inIdOrder = _.sortBy(users, 'id');

// then things started becoming unruly... so IndexedArray!

describe('IndexedArray', function () {
  describe('Basics', function () {
    let reg;

    beforeEach(function () {
      reg = new IndexedArray();
    });

    it('Extends Array', function () {
      expect(reg).to.be.a(Array);
    });

    it('fails basic lodash check', function () {
      expect(_.isArray(reg)).to.be(false);
    });

    it('clones to an object', function () {
      expect(_.isPlainObject(_.clone(reg))).to.be(true);
      expect(_.isArray(_.clone(reg))).to.be(false);
    });
  });

  describe('Indexing', function () {
    it('provides the initial set', function () {
      const reg = new IndexedArray({
        initialSet: [1, 2, 3]
      });

      expect(reg).to.have.length(3);

      reg.forEach(function (v, i) {
        expect(v).to.eql(i + 1);
      });
    });

    it('indexes the initial set', function () {
      const reg = new IndexedArray({
        index: ['username'],
        initialSet: users
      });

      expect(reg).to.have.property('byUsername');
      expect(reg.byUsername).to.eql(users.byUsername);
    });

    it('updates indices after values are added', function () {
      // split up the user list, and add it in chunks
      const firstUser = users.slice(0, 1).pop();
      const otherUsers = users.slice(1);

      // start off with all but the first
      const reg = new IndexedArray({
        group: ['group'],
        order: ['id'],
        initialSet: otherUsers
      });

      // add the first
      reg.push(firstUser);

      // end up with the same structure that is in the users fixture
      expect(reg.byGroup).to.eql(users.byGroup);
      expect(reg.inIdOrder).to.eql(users.inIdOrder);
    });

    it('updates indices after values are removed', function () {
      // start off with all
      const reg = new IndexedArray({
        group: ['group'],
        order: ['id'],
        initialSet: users
      });

      // remove the last
      reg.pop();

      const expectedCount = users.length - 1;
      // indexed lists should be updated
      expect(reg).to.have.length(expectedCount);

      const sumOfGroups = _.reduce(reg.byGroup, function (note, group) {
        return note + group.length;
      }, 0);
      expect(sumOfGroups).to.eql(expectedCount);
    });

    it('removes items based on a predicate', function () {
      const reg = new IndexedArray({
        group: ['group'],
        order: ['id'],
        initialSet: users
      });

      reg.remove({ name: 'John' });

      expect(_.eq(reg.raw, reg.slice(0))).to.be(true);
      expect(reg.length).to.be(3);
      expect(reg[0].name).to.be('Anon');
    });

    it('updates indices after values are re-ordered', function () {
      const rawUsers = users.slice(0);

      // collect and shuffle the ids available
      let ids = [];
      _.times(rawUsers.length, function (i) { ids.push(i); });
      ids = _.shuffle(ids);

      // move something here
      const toI = ids.shift();
      // from here
      const fromI = ids.shift();
      // do the move
      const move = function (arr) { arr.splice(toI, 0, arr.splice(fromI, 1)[0]); };

      const reg = new IndexedArray({
        index: ['username'],
        initialSet: rawUsers
      });

      const index = reg.byUsername;

      move(reg);

      expect(reg.byUsername).to.eql(index);
      expect(reg.byUsername).to.not.be(index);
    });
  });
});
