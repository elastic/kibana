import expect from 'expect.js';
import { sortPrefixFirst } from '../sort_prefix_first';

describe('sortPrefixFirst', function () {
  it('should return the original unmodified array if no prefix is provided', function () {
    const array = ['foo', 'bar', 'baz'];
    const result = sortPrefixFirst(array);
    expect(result).to.be(array);
    expect(result).to.eql(['foo', 'bar', 'baz']);
  });

  it('should sort items that match the prefix first without modifying the original array', function () {
    const array = ['foo', 'bar', 'baz'];
    const result = sortPrefixFirst(array, 'b');
    expect(result).to.not.be(array);
    expect(result).to.eql(['bar', 'baz', 'foo']);
    expect(array).to.eql(['foo', 'bar', 'baz']);
  });

  it('should not modify the order of the array other than matching prefix without modifying the original array', function () {
    const array = ['foo', 'bar', 'baz', 'qux', 'quux'];
    const result = sortPrefixFirst(array, 'b');
    expect(result).to.not.be(array);
    expect(result).to.eql(['bar', 'baz', 'foo', 'qux', 'quux']);
    expect(array).to.eql(['foo', 'bar', 'baz', 'qux', 'quux']);
  });

  it('should sort objects by property if provided', function () {
    const array = [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }, { name: 'qux' }, { name: 'quux' }];
    const result = sortPrefixFirst(array, 'b', 'name');
    expect(result).to.not.be(array);
    expect(result).to.eql([{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }, { name: 'qux' }, { name: 'quux' }]);
    expect(array).to.eql([{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }, { name: 'qux' }, { name: 'quux' }]);
  });

  it('should handle numbers', function () {
    const array = [1, 50, 5];
    const result = sortPrefixFirst(array, 5);
    expect(result).to.not.be(array);
    expect(result).to.eql([50, 5, 1]);
  });
});
