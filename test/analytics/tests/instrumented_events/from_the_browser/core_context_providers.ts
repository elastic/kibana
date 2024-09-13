/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { Event } from '@kbn/core/public';
import { FtrProviderContext } from '../../../services';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const deployment = getService('deployment');
  const ebtUIHelper = getService('kibana_ebt_ui');
  const { common } = getPageObjects(['common']);

  describe('Core Context Providers', () => {
    let event: Event<Record<string, unknown>>;
    before(async () => {
      await common.navigateToApp('home');
      [event] = await ebtUIHelper.getEvents(1, { eventTypes: ['Loaded Kibana'] }); // Get the loaded Kibana event
    });

    it('should have the properties provided by the "cluster info" context provider', () => {
      expect(event.context).to.have.property('cluster_uuid');
      expect(event.context.cluster_uuid).to.be.a('string');
      expect(event.context).to.have.property('cluster_name');
      expect(event.context.cluster_name).to.be.a('string');
      expect(event.context).to.have.property('cluster_version');
      expect(event.context.cluster_version).to.be.a('string');
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

    it('should have the properties provided by the "session-id" context provider', () => {
      expect(event.context).to.have.property('session_id');
      expect(event.context.session_id).to.be.a('string');
    });

    it('should have the properties provided by the "browser info" context provider', () => {
      expect(event.context).to.have.property('user_agent');
      expect(event.context.user_agent).to.be.a('string');
      expect(event.context).to.have.property('preferred_language');
      expect(event.context.preferred_language).to.be.a('string');
      expect(event.context).to.have.property('preferred_languages');
      expect(event.context.preferred_languages).to.be.an('array');
      (event.context.preferred_languages as unknown[]).forEach((lang) =>
        expect(lang).to.be.a('string')
      );
    });

    it('should have the properties provided by the "execution_context" context provider', () => {
      expect(event.context).to.have.property('pageName');
      expect(event.context.pageName).to.be.a('string');
      expect(event.context).to.have.property('applicationId');
      expect(event.context.applicationId).to.be.a('string');
      expect(event.context).not.to.have.property('entityId'); // In the Home app it's not available.
      expect(event.context).not.to.have.property('page'); // In the Home app it's not available.
    });

    it('should have the properties provided by the "license info" context provider', async () => {
      await common.clickAndValidate('kibanaChrome', 'kibanaChrome');
      [event] = await ebtUIHelper.getEvents(1, { eventTypes: ['click'] }); // Get a later event to ensure license has been obtained already.
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

    it('should have the properties provided by the "viewport_size" context provider', async () => {
      expect(event.context).to.have.property('viewport_width');
      expect(event.context.viewport_width).to.be.a('number');
      expect(event.context).to.have.property('viewport_height');
      expect(event.context.viewport_height).to.be.a('number');
    });

    it('should have the properties provided by the "page title" context provider', async () => {
      expect(event.context).to.have.property('page_title');
      expect(event.context.page_title).to.be.a('string');
    });

    it('should have the properties provided by the "page url" context provider', () => {
      expect(event.context).to.have.property('page_url');
      expect(event.context.page_url).to.be.a('string');
    });
  });
}
