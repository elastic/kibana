var isUpgradeable = require('../../../../src/server/lib/isUpgradeable');
var expect = require('expect.js');
var util = require('util');
var package = require('../../../../package.json');

describe('lib/isUpgradeable', function () {

  function upgradeDoc(_id, version, bool) {
    it(util.format('should return %s for %s <= %s', bool, _id, version), function () {
      var doc = { _id: _id };
      package.version = version;
      expect(isUpgradeable(doc)).to.be(bool);
    });
  }

  upgradeDoc('1.0.0-beta1', package.version, false);
  upgradeDoc(package.version, package.version, false);
  upgradeDoc('4.0.0-RC1', '4.0.0-RC2', true);
  upgradeDoc('4.0.0-rc2', '4.0.0-rc1', false);
  upgradeDoc('4.0.0-rc2', '4.0.0', true);
  upgradeDoc('4.0.0-rc2', '4.0.2', true);
  upgradeDoc('4.0.1', '4.1.0-rc', true);
  upgradeDoc('4.0.0-rc1', '4.0.0', true);
  upgradeDoc('4.0.0-rc1-snapshot', '4.0.0', false);
  upgradeDoc('4.1.0-rc1-snapshot', '4.1.0-rc1', false);

});
