import expect from 'expect.js';

import { parseCommaSeparatedList } from '../comma_separated_list';

describe('utils parseCommaSeparatedList()', () => {
  it('supports non-string values', () => {
    expect(parseCommaSeparatedList(0)).to.eql([]);
    expect(parseCommaSeparatedList(1)).to.eql(['1']);
    expect(parseCommaSeparatedList({})).to.eql(['[object Object]']);
    expect(parseCommaSeparatedList(() => {})).to.eql(['() => {}']);
    expect(parseCommaSeparatedList((a, b) => b)).to.eql(['(a', 'b) => b']);
    expect(parseCommaSeparatedList(/foo/)).to.eql(['/foo/']);
    expect(parseCommaSeparatedList(null)).to.eql([]);
    expect(parseCommaSeparatedList(undefined)).to.eql([]);
    expect(parseCommaSeparatedList(false)).to.eql([]);
    expect(parseCommaSeparatedList(true)).to.eql(['true']);
  });

  it('returns argument untouched if it is an array', () => {
    const inputs = [
      [],
      [1],
      ['foo,bar']
    ];
    for (const input of inputs) {
      const json = JSON.stringify(input);
      expect(parseCommaSeparatedList(input)).to.be(input);
      expect(json).to.be(JSON.stringify(input));
    }
  });

  it('trims whitspace around elements', () => {
    expect(parseCommaSeparatedList('1 ,    2,    3     ,    4')).to.eql(['1', '2', '3', '4']);
  });

  it('ignored empty elements between multiple commas', () => {
    expect(parseCommaSeparatedList('foo , , ,,,,, ,      ,bar')).to.eql(['foo', 'bar']);
  });
});
