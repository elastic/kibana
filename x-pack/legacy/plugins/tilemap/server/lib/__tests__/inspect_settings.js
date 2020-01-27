/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { inspectSettings } from '../../../server/lib/inspect_settings';

describe('inspectSettings', function() {
  it('should propagate x-pack info', function() {
    const mockSettings = {
      isAvailable: () => true,
      license: {
        getUid: () => 'foobar',
        isActive: () => true,
        isOneOf: () => true,
      },
    };

    const licenseInfo = inspectSettings(mockSettings);
    expect(licenseInfo.license.uid).to.equal('foobar');
    expect(licenseInfo.license.active).to.equal(true);
    expect(licenseInfo.license.valid).to.equal(true);
  });

  it('should break when unavailable info', function() {
    const mockSettings = {
      isAvailable: () => false,
    };

    const licenseInfo = inspectSettings(mockSettings);
    expect(licenseInfo).to.have.property('message');
    expect(typeof licenseInfo.message === 'string').to.be.ok();
  });
});
