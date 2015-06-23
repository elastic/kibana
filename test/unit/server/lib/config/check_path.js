var root = require('requirefrom')('');
var checkPath = root('src/server/lib/config/check_path');
var expect = require('expect.js');
var path = require('path');
var _ = require('lodash');

describe('checkPath(path)', function () {

  it('should return true for files that exist', function () {
    expect(checkPath(__dirname)).to.be(true);
  });

  it('should return true for files that exist', function () {
    expect(checkPath(path.join(__dirname, 'something_fake'))).to.be(false);
  });

});

