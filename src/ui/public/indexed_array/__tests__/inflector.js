import { inflector } from 'ui/indexed_array/inflector';
import expect from 'expect.js';

describe('IndexedArray Inflector', function () {
  it('returns a function', function () {
    const getter = inflector();
    expect(getter).to.be.a('function');
  });

  describe('fn', function () {
    it('prepends a prefix', function () {
      const inflect = inflector('my');

      expect(inflect('Family')).to.be('myFamily');
      expect(inflect('family')).to.be('myFamily');
      expect(inflect('fAmIlY')).to.be('myFAmIlY');
    });

    it('adds both a prefix and suffix', function () {
      const inflect = inflector('foo', 'Bar');

      expect(inflect('box')).to.be('fooBoxBar');
      expect(inflect('box.car.MAX')).to.be('fooBoxCarMaxBar');
      expect(inflect('BaZzY')).to.be('fooBaZzYBar');
    });

    it('ignores prefix if it is already at the end of the inflected string', function () {
      const inflect = inflector('foo', 'Bar');
      expect(inflect('fooBox')).to.be('fooBoxBar');
      expect(inflect('FooBox')).to.be('FooBoxBar');
    });

    it('ignores postfix if it is already at the end of the inflected string', function () {
      const inflect = inflector('foo', 'Bar');
      expect(inflect('bar')).to.be('fooBar');
      expect(inflect('showBoxBar')).to.be('fooShowBoxBar');
    });

    it('works with "name"', function () {
      const inflect = inflector('in', 'Order');
      expect(inflect('name')).to.be('inNameOrder');
    });
  });
});
