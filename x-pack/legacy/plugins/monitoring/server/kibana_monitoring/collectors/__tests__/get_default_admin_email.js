/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { getDefaultAdminEmail } from '../get_settings_collector';
import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY } from '../../../../common/constants';

describe('getSettingsCollector / getDefaultAdminEmail', () => {
  function setup({ enabled = true, adminEmail = null } = {}) {
    const config = { get: sinon.stub() };

    config.get
      .withArgs('xpack.monitoring.cluster_alerts.email_notifications.enabled')
      .returns(enabled);

    if (adminEmail) {
      config.get
        .withArgs(`xpack.monitoring.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}`)
        .returns(adminEmail);
    }

    config.get.withArgs('kibana.index').returns('.kibana');

    config.get.withArgs('pkg.version').returns('1.1.1');

    return config;
  }

  describe('xpack.monitoring.cluster_alerts.email_notifications.enabled = false', () => {
    it('returns null when email is defined', async () => {
      const config = setup({ enabled: false });
      expect(await getDefaultAdminEmail(config)).to.be(null);
    });

    it('returns null when email is undefined', async () => {
      const config = setup({ enabled: false });
      expect(await getDefaultAdminEmail(config)).to.be(null);
    });
  });

  describe('xpack.monitoring.cluster_alerts.email_notifications.enabled = true', () => {
    it('returns value when email is defined', async () => {
      const config = setup({ adminEmail: 'hello@world' });
      expect(await getDefaultAdminEmail(config)).to.be('hello@world');
    });
    it('returns null when email is undefined', async () => {
      const config = setup();
      expect(await getDefaultAdminEmail(config)).to.be(null);
    });
  });
});
