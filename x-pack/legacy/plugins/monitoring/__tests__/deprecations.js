/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import expect from '@kbn/expect';
import { deprecations as deprecationsModule } from '../deprecations';
import sinon from 'sinon';

describe('monitoring plugin deprecations', function() {
  let transformDeprecations;

  before(function() {
    const deprecations = deprecationsModule();
    transformDeprecations = (settings, log = noop) => {
      deprecations.forEach(deprecation => deprecation(settings, log));
    };
  });

  describe('cluster_alerts.email_notifications.email_address', function() {
    it(`shouldn't log when email notifications are disabled`, function() {
      const settings = {
        cluster_alerts: {
          email_notifications: {
            enabled: false,
          },
        },
      };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(false);
    });

    it(`shouldn't log when cluster alerts are disabled`, function() {
      const settings = {
        cluster_alerts: {
          enabled: false,
          email_notifications: {
            enabled: true,
          },
        },
      };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(false);
    });

    it(`shouldn't log when email_address is specified`, function() {
      const settings = {
        cluster_alerts: {
          enabled: true,
          email_notifications: {
            enabled: true,
            email_address: 'foo@bar.com',
          },
        },
      };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(false);
    });

    it(`should log when email_address is missing, but alerts/notifications are both enabled`, function() {
      const settings = {
        cluster_alerts: {
          enabled: true,
          email_notifications: {
            enabled: true,
          },
        },
      };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(true);
    });
  });
});
