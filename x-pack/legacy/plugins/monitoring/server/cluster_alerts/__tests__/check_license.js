/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkLicense, checkLicenseGenerator } from '../check_license';
import expect from '@kbn/expect';
import sinon from 'sinon';

describe('Monitoring Check License', () => {
  describe('License undeterminable', () => {
    it('null active license - results false with a message', () => {
      const result = checkLicense(null, true, 'test-cluster-abc');
      expect(result).to.eql({
        clusterAlerts: { enabled: false },
        message: `Cluster Alerts are not displayed because the [test-cluster-abc] cluster's license could not be determined.`
      });
    });
  });

  describe('Inactive license', () => {
    it('platinum inactive license - results false with a message', () => {
      const result = checkLicense('platinum', false, 'test-cluster-def');
      expect(result).to.eql({
        clusterAlerts: { enabled: false },
        message: `Cluster Alerts are not displayed because the [test-cluster-def] cluster's current license [platinum] is not active.`
      });
    });
  });

  describe('Active license', () => {
    describe('Unsupported license types', () => {
      it('basic active license - results false with a message', () => {
        const result = checkLicense('basic', true, 'test-cluster-ghi');
        expect(result).to.eql({
          clusterAlerts: { enabled: false },
          message: `Cluster Alerts are not displayed if Watcher is disabled or the [test-cluster-ghi] cluster's current license is Basic.`
        });
      });
    });

    describe('Supported license types', () => {
      it('standard active license - results true with no message', () => {
        const result = checkLicense('standard', true, 'test-cluster-jkl');
        expect(result).to.eql({
          clusterAlerts: { enabled: true }
        });
      });

      it('gold active license - results true with no message', () => {
        const result = checkLicense('gold', true, 'test-cluster-mno');
        expect(result).to.eql({
          clusterAlerts: { enabled: true }
        });
      });

      it('platinum active license - results true with no message', () => {
        const result = checkLicense('platinum', true, 'test-cluster-pqr');
        expect(result).to.eql({
          clusterAlerts: { enabled: true }
        });
      });

      describe('Watcher is not enabled', () => {
        it('platinum active license - watcher disabled - results false with message', () => {
          const result = checkLicense('platinum', true, 'test-cluster-pqr', false);
          expect(result).to.eql({
            clusterAlerts: { enabled: false },
            message: 'Cluster Alerts are not enabled because Watcher is disabled.'
          });
        });
      });
    });
  });

  describe('XPackInfo checkLicenseGenerator', () => {
    it('with deleted license', () => {
      const expected = 123;
      const checker = sinon.stub().returns(expected);
      const result = checkLicenseGenerator(null, checker);

      expect(result).to.be(expected);
      expect(checker.withArgs(undefined, false, 'monitoring', false).called).to.be(true);
    });

    it('license without watcher', () => {
      const expected = 123;
      const xpackInfo = {
        license: {
          getType: () => 'fake-type',
          isActive: () => true
        },
        feature: () => null
      };
      const checker = sinon.stub().returns(expected);
      const result = checkLicenseGenerator(xpackInfo, checker);

      expect(result).to.be(expected);
      expect(checker.withArgs('fake-type', true, 'monitoring', false).called).to.be(true);
    });

    it('mock license with watcher', () => {
      const expected = 123;
      const feature = sinon.stub().withArgs('watcher').returns({ isEnabled: () => true });
      const xpackInfo = {
        license: {
          getType: () => 'another-type',
          isActive: () => true
        },
        feature
      };
      const checker = sinon.stub().returns(expected);
      const result = checkLicenseGenerator(xpackInfo, checker);

      expect(result).to.be(expected);
      expect(feature.withArgs('watcher').calledOnce).to.be(true);
      expect(checker.withArgs('another-type', true, 'monitoring', true).called).to.be(true);
    });

    it('platinum license with watcher', () => {
      const xpackInfo = {
        license: {
          getType: () => 'platinum',
          isActive: () => true
        },
        feature: () => {
          return {
            isEnabled: () => true
          };
        }
      };
      const result = checkLicenseGenerator(xpackInfo);

      expect(result).to.eql({ clusterAlerts: { enabled: true } });
    });
  });
});
