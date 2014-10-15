define(function (require) {
  return function () {
    var pathGetter = require('utils/indexed_array/_path_getter');

    describe('Path Getter', function () {
      it('returns a function', function () {
        var getter = pathGetter('some.nonexistant.property');
        expect(getter).to.be.a('function');
      });

      describe('... Getter', function () {
        it('gets values from the object it is passed', function () {
          var getter = pathGetter('some.nested.prop');
          var val = getter({ some: { nested: { prop: 42 }}});
          expect(val).to.be(42);
        });

        it('works just as well if we specify just a prop', function () {
          var getter = pathGetter('name');
          var val = getter({ name: 'Master Smitty Johnston III' });
          expect(val).to.be('Master Smitty Johnston III');
        });

        it('returns undefined if the object does not exist', function () {
          var getter = pathGetter('no.spelllllllling.writer');
          var val = getter({ spelled: { right: 5 } });
          expect(val).to.be(undefined);
        });

      });
    });
  };
});