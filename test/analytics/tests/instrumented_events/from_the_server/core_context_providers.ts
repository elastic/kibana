/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Event } from '@kbn/core/public';
import { FtrProviderContext } from '../../../services';

export default function ({ getService }: FtrProviderContext) {
  const deployment = getService('deployment');
  const ebtServerHelper = getService('kibana_ebt_server');

  describe('Core Context Providers', () => {
    let event: Event<Record<string, unknown>>;
    before(async () => {
      let i = 2;
      do {
        // Wait until we get a GREEN "status_changed" event. At that point all the context providers should be set up.
        const events = await ebtServerHelper.getEvents(i, {
          eventTypes: ['core-overall_status_changed'],
        });
        event = events[i - 1];
        i++;
      } while (event.properties.overall_status_level !== 'available');
    });

    it('should have the properties provided by the "kibana info" context provider', () => {
      expect(event.context).to.have.property('kibana_uuid');
      expect(event.context.kibana_uuid).to.be.a('string');
      expect(event.context).to.have.property('pid');
      expect(event.context.pid).to.be.a('number');
    });

    it('should have the properties provided by the "build info" context provider', () => {
      expect(event.context).to.have.property('isDev');
      expect(event.context.isDev).to.be.a('boolean');
      expect(event.context).to.have.property('isDistributable');
      expect(event.context.isDistributable).to.be.a('boolean');
      expect(event.context).to.have.property('version');
      expect(event.context.version).to.be.a('string');
      expect(event.context).to.have.property('branch');
      expect(event.context.branch).to.be.a('string');
      expect(event.context).to.have.property('buildNum');
      expect(event.context.buildNum).to.be.a('number');
      expect(event.context).to.have.property('buildSha');
      expect(event.context.buildSha).to.be.a('string');
    });

    it('should have the properties provided by the "cluster info" context provider', () => {
      expect(event.context).to.have.property('cluster_uuid');
      expect(event.context.cluster_uuid).to.be.a('string');
      expect(event.context).to.have.property('cluster_name');
      expect(event.context.cluster_name).to.be.a('string');
      expect(event.context).to.have.property('cluster_version');
      expect(event.context.cluster_version).to.be.a('string');
    });

    it('should have the properties provided by the "status info" context provider', () => {
      expect(event.context).to.have.property('overall_status_level');
      expect(event.context.overall_status_level).to.be.a('string');
      expect(event.context).to.have.property('overall_status_summary');
      expect(event.context.overall_status_summary).to.be.a('string');
    });

    it('should have the properties provided by the "license info" context provider', () => {
      expect(event.context).to.have.property('license_id');
      expect(event.context.license_id).to.be.a('string');
      expect(event.context).to.have.property('license_status');
      expect(event.context.license_status).to.be.a('string');
      expect(event.context).to.have.property('license_type');
      expect(event.context.license_type).to.be.a('string');
    });

    it('should have the properties provided by the "Cloud Deployment ID" context provider', async () => {
      if (await deployment.isCloud()) {
        expect(event.context).to.have.property('cloudId');
        expect(event.context.cloudId).to.be.a('string');
      } else {
        expect(event.context).not.to.have.property('cloudId');
      }
    });
  });
}
