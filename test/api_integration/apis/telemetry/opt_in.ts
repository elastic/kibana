/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';

import { TelemetrySavedObjectAttributes } from '@kbn/telemetry-plugin/server/saved_objects';
import SuperTest from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const esClient: Client = getService('es');

  describe('/api/telemetry/v2/optIn API', () => {
    let defaultAttributes: TelemetrySavedObjectAttributes;
    let kibanaVersion: string;
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      const kibanaVersionAccessor = kibanaServer.version;
      kibanaVersion = await kibanaVersionAccessor.get();
      defaultAttributes = await getSavedObjectAttributes(esClient);

      expect(typeof kibanaVersion).to.eql('string');
      expect(kibanaVersion.length).to.be.greaterThan(0);
    });

    afterEach(async () => {
      await updateSavedObjectAttributes(esClient, defaultAttributes);
    });

    it('should support sending false with allowChangingOptInStatus true', async () => {
      await updateSavedObjectAttributes(esClient, {
        allowChangingOptInStatus: true,
      });
      await postTelemetryV2OptIn(supertest, false, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(esClient);
      expect(enabled).to.be(false);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should support sending true with allowChangingOptInStatus true', async () => {
      await updateSavedObjectAttributes(esClient, {
        ...defaultAttributes,
        allowChangingOptInStatus: true,
      });
      await postTelemetryV2OptIn(supertest, true, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(esClient);
      expect(enabled).to.be(true);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should not support sending false with allowChangingOptInStatus false', async () => {
      await updateSavedObjectAttributes(esClient, {
        ...defaultAttributes,
        allowChangingOptInStatus: false,
      });
      await postTelemetryV2OptIn(supertest, false, 400);
    });

    it('should not support sending true with allowChangingOptInStatus false', async () => {
      await updateSavedObjectAttributes(esClient, {
        ...defaultAttributes,
        allowChangingOptInStatus: false,
      });
      await postTelemetryV2OptIn(supertest, true, 400);
    });

    it('should not support sending null', async () => {
      await postTelemetryV2OptIn(supertest, null, 400);
    });

    it('should not support sending junk', async () => {
      await postTelemetryV2OptIn(supertest, 42, 400);
    });
  });
}

async function postTelemetryV2OptIn(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  value: unknown,
  statusCode: number
): Promise<any> {
  const { body } = await supertest
    .post('/api/telemetry/v2/optIn')
    .set('kbn-xsrf', 'xxx')
    .send({ enabled: value })
    .expect(statusCode);

  return body;
}

async function updateSavedObjectAttributes(
  es: Client,
  attributes: TelemetrySavedObjectAttributes
): Promise<void> {
  // Directly writing to the `.kibana` index because the SO type now is hidden, meaning it's not exposed via the SO HTTP API
  await es.update({
    index: '.kibana',
    id: 'telemetry:telemetry',
    doc: {
      telemetry: attributes,
      // there are many missing fields in the SO, hopefully it doesn't break Kibana
    },
    doc_as_upsert: true,
  });
}

async function getSavedObjectAttributes(es: Client): Promise<TelemetrySavedObjectAttributes> {
  // Directly writing to the `.kibana` index because the SO type now is hidden, meaning it's not exposed via the SO HTTP API
  const { _source: body } = await es.get<{ telemetry: TelemetrySavedObjectAttributes }>(
    {
      index: '.kibana',
      id: 'telemetry:telemetry',
    },
    { ignore: [404] }
  );
  return body?.telemetry || {};
}
