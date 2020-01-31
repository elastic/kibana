/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { checkLicense } from '../check_license';

describe('check_license', function() {
  let mockXPackInfo;

  beforeEach(function() {
    mockXPackInfo = {
      isAvailable: sinon.stub(),
      isXpackUnavailable: sinon.stub(),
      feature: sinon.stub(),
      license: sinon.stub({
        isOneOf() {},
      }),
    };

    mockXPackInfo.isAvailable.returns(true);
  });

  it('should display error when ES is unavailable', () => {
    mockXPackInfo.isAvailable.returns(false);
    mockXPackInfo.isXpackUnavailable.returns(false);

    const licenseCheckResults = checkLicense(mockXPackInfo);
    expect(licenseCheckResults).to.be.eql({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-es-unavailable',
      allowRbac: false,
    });
  });

  it('should display error when X-Pack is unavailable', () => {
    mockXPackInfo.isAvailable.returns(false);
    mockXPackInfo.isXpackUnavailable.returns(true);

    const licenseCheckResults = checkLicense(mockXPackInfo);
    expect(licenseCheckResults).to.be.eql({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-xpack-unavailable',
      allowRbac: false,
    });
  });

  it('should show login page and other security elements if license is basic and security is enabled.', () => {
    mockXPackInfo.license.isOneOf.withArgs(['basic']).returns(true);
    mockXPackInfo.license.isOneOf.withArgs(['platinum', 'trial']).returns(false);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => {
        return true;
      },
    });

    const licenseCheckResults = checkLicense(mockXPackInfo);
    expect(licenseCheckResults).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: true,
    });
  });

  it('should not show login page or other security elements if security is disabled in Elasticsearch.', () => {
    mockXPackInfo.license.isOneOf.withArgs(['basic']).returns(false);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => {
        return false;
      },
    });

    const licenseCheckResults = checkLicense(mockXPackInfo);
    expect(licenseCheckResults).to.be.eql({
      showLogin: false,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: false,
      linksMessage: 'Access is denied because Security is disabled in Elasticsearch.',
    });
  });

  it('should allow to login and allow RBAC but forbid document level security if license is not platinum or trial.', () => {
    mockXPackInfo.license.isOneOf
      .returns(false)
      .withArgs(['platinum', 'trial'])
      .returns(false);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => {
        return true;
      },
    });

    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: true,
    });
  });

  it('should allow to login, allow RBAC and document level security if license is platinum or trial.', () => {
    mockXPackInfo.license.isOneOf
      .returns(false)
      .withArgs(['platinum', 'trial'])
      .returns(true);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => {
        return true;
      },
    });

    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true,
      allowRbac: true,
    });
  });
});
