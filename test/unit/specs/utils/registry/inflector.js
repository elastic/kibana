define(function (require) {
  return function () {
    var inflector = require('utils/registry/_inflector');

    describe('Inflector', function () {
      it('returns a function', function () {
        var getter = inflector();
        expect(getter).to.be.a('function');
      });

      describe('fn', function () {
        it('prepends a prefix', function () {
          var inflect = inflector('my');

          expect(inflect('Family')).to.be('myFamily');
          expect(inflect('family')).to.be('myFamily');
          expect(inflect('fAmIlY')).to.be('myFamily');
        });

        it('adds both a prefix and suffix', function () {
          var inflect = inflector('foo', 'Bar');

          expect(inflect('box')).to.be('fooBoxBar');
          expect(inflect('box.car.MAX')).to.be('fooBoxCarMaxBar');
          expect(inflect('BaZzY')).to.be('fooBazzyBar');
        });
      });
    });
  };
});