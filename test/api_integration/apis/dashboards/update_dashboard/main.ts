/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PUBLIC_API_PATH } from '@kbn/dashboard-plugin/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('should return 201 with an updated dashboard', async () => {
      const response = await supertest
        .put(`${PUBLIC_API_PATH}/be3733a0-9efe-11e7-acb3-3dab96693fab`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
            title: 'Refresh Requests (Updated)',
            options: { useMargins: false },
            panels: [
              {
                type: 'visualization',
                gridData: { x: 0, y: 0, w: 48, h: 60, i: '1' },
                panelIndex: '1',
                panelRefName: 'panel_1',
                version: '7.3.0',
              },
            ],
            timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
            timeRestore: true,
            timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
          },
          references: [
            {
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              name: '1:panel_1',
              type: 'visualization',
            },
          ],
        });

      expect(response.status).to.be(201);

      expect(response.body.item.id).to.be('be3733a0-9efe-11e7-acb3-3dab96693fab');
      expect(response.body.item.type).to.be('dashboard');
      expect(response.body.item.attributes.title).to.be('Refresh Requests (Updated)');
    });

    it('should return 404 when updating a non-existent dashboard', async () => {
      const response = await supertest
        .put(`${PUBLIC_API_PATH}/not-an-id`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: {
            title: 'Some other dashboard (updated)',
          },
        });

      expect(response.status).to.be(404);
      expect(response.body).to.eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'A dashboard with saved object ID not-an-id was not found.',
      });
    });
  });
}
