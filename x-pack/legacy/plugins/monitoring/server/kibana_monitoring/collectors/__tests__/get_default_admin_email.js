/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { set } from 'lodash';

import { XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING } from '../../../../../../server/lib/constants';
import { getDefaultAdminEmail, resetDeprecationWarning } from '../get_settings_collector';
import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY } from '../../../../common/constants';

describe('getSettingsCollector / getDefaultAdminEmail', () => {
  function setup({
    enabled = true,
    docExists = true,
    defaultAdminEmail = 'default-admin@email.com',
    adminEmail = null,
  }) {
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

    const doc = {};
    if (docExists) {
      if (defaultAdminEmail) {
        set(doc, ['_source', 'config', XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING], defaultAdminEmail);
      } else {
        set(doc, '_source.config', {});
      }
    } else {
      doc.found = false;
    }

    const callCluster = sinon
      .stub()
      .withArgs(
        'get',
        sinon.match({
          index: '.kibana',
          type: 'doc',
          id: 'config:1.1.1',
        })
      )
      .returns(doc);

    const log = {
      warn: sinon.stub(),
    };

    return {
      config,
      callCluster,
      log,
    };
  }

  describe('using xpack:defaultAdminEmail', () => {
    beforeEach(() => {
      resetDeprecationWarning();
    });

    describe('xpack.monitoring.cluster_alerts.email_notifications.enabled = false', () => {
      it('returns null', async () => {
        const { config, callCluster, log } = setup({ enabled: false });
        expect(await getDefaultAdminEmail(config, callCluster, log)).to.be(null);
        sinon.assert.notCalled(callCluster);
      });

      it('does not log a deprecation warning', async () => {
        const { config, callCluster, log } = setup({ enabled: false });
        await getDefaultAdminEmail(config, callCluster, log);
        sinon.assert.notCalled(log.warn);
      });
    });

    describe('doc does not exist', () => {
      it('returns null', async () => {
        const { config, callCluster, log } = setup({ docExists: false });
        expect(await getDefaultAdminEmail(config, callCluster, log)).to.be(null);
        sinon.assert.calledOnce(callCluster);
      });

      it('does not log a deprecation warning', async () => {
        const { config, callCluster, log } = setup({ docExists: false });
        await getDefaultAdminEmail(config, callCluster, log);
        sinon.assert.notCalled(log.warn);
      });
    });

    describe('value is not defined', () => {
      it('returns null', async () => {
        const { config, callCluster, log } = setup({ defaultAdminEmail: false });
        expect(await getDefaultAdminEmail(config, callCluster, log)).to.be(null);
        sinon.assert.calledOnce(callCluster);
      });

      it('does not log a deprecation warning', async () => {
        const { config, callCluster, log } = setup({ defaultAdminEmail: false });
        await getDefaultAdminEmail(config, callCluster, log);
        sinon.assert.notCalled(log.warn);
      });
    });

    describe('value is defined', () => {
      it('returns value', async () => {
        const { config, callCluster, log } = setup({ defaultAdminEmail: 'hello@world' });
        expect(await getDefaultAdminEmail(config, callCluster, log)).to.be('hello@world');
        sinon.assert.calledOnce(callCluster);
      });

      it('logs a deprecation warning', async () => {
        const { config, callCluster, log } = setup({ defaultAdminEmail: 'hello@world' });
        await getDefaultAdminEmail(config, callCluster, log);
        sinon.assert.calledOnce(log.warn);
      });
    });
  });

  describe('using xpack.monitoring.cluster_alerts.email_notifications.email_address', () => {
    beforeEach(() => {
      resetDeprecationWarning();
    });

    describe('xpack.monitoring.cluster_alerts.email_notifications.enabled = false', () => {
      it('returns null', async () => {
        const { config, callCluster, log } = setup({ enabled: false });
        expect(await getDefaultAdminEmail(config, callCluster, log)).to.be(null);
        sinon.assert.notCalled(callCluster);
      });

      it('does not log a deprecation warning', async () => {
        const { config, callCluster, log } = setup({ enabled: false });
        await getDefaultAdminEmail(config, callCluster, log);
        sinon.assert.notCalled(log.warn);
      });
    });

    describe('value is not defined', () => {
      it('returns value from xpack:defaultAdminEmail', async () => {
        const { config, callCluster, log } = setup({
          defaultAdminEmail: 'default-admin@email.com',
          adminEmail: false,
        });
        expect(await getDefaultAdminEmail(config, callCluster, log)).to.be(
          'default-admin@email.com'
        );
        sinon.assert.calledOnce(callCluster);
      });

      it('logs a deprecation warning', async () => {
        const { config, callCluster, log } = setup({
          defaultAdminEmail: 'default-admin@email.com',
          adminEmail: false,
        });
        await getDefaultAdminEmail(config, callCluster, log);
        sinon.assert.calledOnce(log.warn);
      });
    });

    describe('value is defined', () => {
      it('returns value', async () => {
        const { config, callCluster, log } = setup({ adminEmail: 'hello@world' });
        expect(await getDefaultAdminEmail(config, callCluster, log)).to.be('hello@world');
        sinon.assert.notCalled(callCluster);
      });

      it('does not log a deprecation warning', async () => {
        const { config, callCluster, log } = setup({ adminEmail: 'hello@world' });
        await getDefaultAdminEmail(config, callCluster, log);
        sinon.assert.notCalled(log.warn);
      });
    });
  });
});
