/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { deprecations as deprecationsModule } from '../deprecations';
import sinon from 'sinon';

const unused = sinon.stub();

describe('monitoring plugin deprecations', function() {
  describe('cluster_alerts.email_notifications.email_address', function() {
    it(`mark as unused`, function() {
      deprecationsModule({ unused });
      expect(unused.called).to.be(true);
    });
  });
});
