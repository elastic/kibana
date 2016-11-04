import expect from 'expect.js';
import { geohashColumns } from 'ui/utils/decode_geo_hash';

describe('decode_geo_hash', function () {
  it('geohashColumns', function () {
    expect(geohashColumns(1)).to.equal(8);
    expect(geohashColumns(2)).to.equal(8 * 4);
    expect(geohashColumns(3)).to.equal(8 * 4 * 8);
    expect(geohashColumns(4)).to.equal(8 * 4 * 8 * 4);
  });
});
