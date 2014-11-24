define(function (require) {
  var _ = require('lodash');
  var IndexedArray = require('utils/indexed_array/index');

  // this is generally a data-structure that IndexedArray is good for managing
  var users = [
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
      var reg;

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
        var reg = new IndexedArray({
          initialSet: [1, 2, 3]
        });

        expect(reg).to.have.length(3);

        reg.forEach(function (v, i) {
          expect(v).to.eql(i + 1);
        });
      });

      it('indexes the initial set', function () {
        var reg = new IndexedArray({
          index: ['username'],
          initialSet: users
        });

        expect(reg).to.have.property('byUsername');
        expect(reg.byUsername).to.eql(users.byUsername);
      });

      it('updates indices after values are added', function () {
        // split up the user list, and add it in chunks
        var firstUser = users.slice(0, 1).pop();
        var otherUsers = users.slice(1);

        // start off with all but the first
        var reg = new IndexedArray({
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
        var reg = new IndexedArray({
          group: ['group'],
          order: ['id'],
          initialSet: users
        });

        // remove the last
        reg.pop();

        var expectedCount = users.length - 1;
        // indexed lists should be updated
        expect(reg).to.have.length(expectedCount);

        var sumOfGroups = _.reduce(reg.byGroup, function (note, group) {
          return note + group.length;
        }, 0);
        expect(sumOfGroups).to.eql(expectedCount);
      });

      it('updates indices after values are re-ordered', function () {
        var rawUsers = users.slice(0);

        // collect and shuffle the ids available
        var ids = [];
        _.times(rawUsers.length, function (i) { ids.push(i); });
        ids = _.shuffle(ids);

        // move something here
        var toI = ids.shift();
        // from here
        var fromI = ids.shift();
        // do the move
        var move = function (arr) { arr.splice(toI, 0, arr.splice(fromI, 1)[0]); };

        var reg = new IndexedArray({
          index: ['username'],
          initialSet: rawUsers
        });

        var index = reg.byUsername;

        move(reg);

        expect(reg.byUsername).to.eql(index);
        expect(reg.byUsername).to.not.be(index);
      });
    });

    require('specs/utils/indexed_array/_inflector')();

    require('specs/utils/indexed_array/_path_getter')();
  });
});