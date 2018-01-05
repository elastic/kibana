import expect from 'expect.js';

import { isConfigVersionUpgradeable } from '../is_config_version_upgradeable';
import { pkg } from '../../../../utils';

describe('savedObjects/health_check/isConfigVersionUpgradeable', function () {
  function isUpgradableTest(savedVersion, kibanaVersion, expected) {
    it(`should return ${expected} for config version ${savedVersion} and kibana version ${kibanaVersion}`, () => {
      expect(isConfigVersionUpgradeable(savedVersion, kibanaVersion)).to.be(expected);
    });
  }

  isUpgradableTest('1.0.0-beta1', pkg.version, false);
  isUpgradableTest('1.0.0-beta256', pkg.version, false);
  isUpgradableTest('10.100.1000-beta256', '10.100.1000-beta257', false);
  isUpgradableTest(pkg.version, pkg.version, false);
  isUpgradableTest('4.0.0-RC1', '4.0.0-RC2', true);
  isUpgradableTest('10.100.1000-rc256', '10.100.1000-RC257', true);
  isUpgradableTest('4.0.0-rc2', '4.0.0-rc1', false);
  isUpgradableTest('4.0.0-rc2', '4.0.0', true);
  isUpgradableTest('4.0.0-rc2', '4.0.2', true);
  isUpgradableTest('4.0.1', '4.1.0-rc', true);
  isUpgradableTest('4.0.0-rc1', '4.0.0', true);
  isUpgradableTest('50.0.9-rc150', '50.0.9', true);
  isUpgradableTest('50.0.9', '50.0.9-rc150', false);
  isUpgradableTest('50.0.9', '50.0.10-rc150', true);
  isUpgradableTest('4.0.0-rc1-SNAPSHOT', '4.0.0', false);
  isUpgradableTest('4.1.0-rc1-SNAPSHOT', '4.1.0-rc1', false);
  isUpgradableTest('5.0.0-alpha11', '5.0.0', false);
  isUpgradableTest('50.0.10-rc150-SNAPSHOT', '50.0.9', false);
  isUpgradableTest(undefined, pkg.version, false);
  isUpgradableTest('@@version', pkg.version, false);
});
