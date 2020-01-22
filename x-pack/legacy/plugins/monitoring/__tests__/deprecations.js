/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { noop } from 'lodash';
import expect from '@kbn/expect';
import { deprecations as deprecationsModule } from '../deprecations';
import sinon from 'sinon';

const unused = sinon.stub();

describe('monitoring plugin deprecations', function() {
  let transformDeprecations;

  before(function() {
    const deprecations = deprecationsModule({ unused });
    transformDeprecations = (settings, log = noop) => {
      deprecations.forEach(deprecation => deprecation && deprecation(settings, log));
    };
  });

  describe('cluster_alerts.email_notifications.email_address', function() {
    it(`mark as unused`, function() {
      deprecationsModule({ unused });
      expect(unused.called).to.be(true);
    });
  });

  describe('elasticsearch.username', function() {
    it('logs a warning if elasticsearch.username is set to "elastic"', () => {
      const settings = { elasticsearch: { username: 'elastic' } };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(true);
    });

    it('does not log a warning if elasticsearch.username is set to something besides "elastic"', () => {
      const settings = { elasticsearch: { username: 'otheruser' } };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(false);
    });

    it('does not log a warning if elasticsearch.username is unset', () => {
      const settings = { elasticsearch: { username: undefined } };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(false);
    });

    it('logs a warning if ssl.key is set and ssl.certificate is not', () => {
      const settings = { elasticsearch: { ssl: { key: '' } } };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(true);
    });

    it('logs a warning if ssl.certificate is set and ssl.key is not', () => {
      const settings = { elasticsearch: { ssl: { certificate: '' } } };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(true);
    });

    it('does not log a warning if both ssl.key and ssl.certificate are set', () => {
      const settings = { elasticsearch: { ssl: { key: '', certificate: '' } } };

      const log = sinon.spy();
      transformDeprecations(settings, log);
      expect(log.called).to.be(false);
    });
  });
});
