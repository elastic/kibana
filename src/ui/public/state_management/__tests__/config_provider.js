import expect from 'expect.js';
import ngMock from 'ng_mock';
import '../config_provider';

describe('State Management Config', function () {
  let stateManagementConfig;

  describe('is enabled', () => {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (_stateManagementConfig_) {
      stateManagementConfig = _stateManagementConfig_;
    }));

    it('should be enabled by default', () => {
      expect(stateManagementConfig.enabled).to.be(true);
    });
  });

  describe('can be disabled', () => {
    beforeEach(ngMock.module('kibana', function (stateManagementConfigProvider) {
      stateManagementConfigProvider.disable();
    }));

    beforeEach(ngMock.inject(function (_stateManagementConfig_) {
      stateManagementConfig = _stateManagementConfig_;
    }));

    it('is disabled by config', () => {
      expect(stateManagementConfig.enabled).to.be(false);
    });
  });
});
