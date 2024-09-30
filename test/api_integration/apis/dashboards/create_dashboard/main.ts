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
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server/content_management';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('can create a dashboard with controls', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const dashboardAttrs: DashboardAttributes = {
        title,
        description: '',
        kibanaSavedObjectMeta: {},
        controlGroupInput: {
          chainingSystem: 'HIERARCHICAL',
          controlStyle: 'oneLine',
          ignoreParentSettings: {},
          panels: [
            {
              type: 'optionsListControl',
              order: 0,
              width: 'medium',
              grow: true,
              embeddableConfig: {
                title: 'Origin City',
                fieldName: 'OriginCityName',
                dataViewId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                selectedOptions: [],
                enhancements: {},
              },
            },
          ],
        },
        panels: [
          {
            type: 'visualization',
            gridData: {
              x: 0,
              y: 0,
              w: 24,
              h: 15,
            },
            embeddableConfig: {},
          },
        ],
        timeRestore: false,
        version: 3,
      };

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: dashboardAttrs,
        });

      expect(response.status).to.be(200);
      // generates a random saved object id
      expect(response.body.item.id).match(/^[0-9a-f-]{36}$/);
      // saved object stores controls panels as an object, but the API should return as an array
      expect(response.body.item.attributes.controlGroupInput.panels).to.be.an('array');

      // panel index is a random uuid when not provided
      expect(response.body.item.attributes.panels[0].panelIndex).match(/^[0-9a-f-]{36}$/);
      expect(response.body.item.attributes.panels[0].panelIndex).to.eql(
        response.body.item.attributes.panels[0].embeddableConfig.id
      );
    });

    it('can create a dashboard with a specific id', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;
      const id = `bar-${Date.now()}-${Math.random()}`;

      const dashboardAttrs: DashboardAttributes = {
        title,
        description: '',
        kibanaSavedObjectMeta: {},
        panels: [],
        timeRestore: false,
        version: 3,
      };

      const response = await supertest
        .post(`${PUBLIC_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: dashboardAttrs,
        });

      expect(response.status).to.be(200);
      expect(response.body.item.id).to.be(id);
    });

    it('creates a dashboard with references', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const dashboardAttrs: DashboardAttributes = {
        title,
        description: '',
        kibanaSavedObjectMeta: {},
        panels: [
          {
            type: 'visualization',
            gridData: {
              x: 0,
              y: 0,
              w: 24,
              h: 15,
              i: 'bizz',
            },
            embeddableConfig: {},
            panelIndex: 'bizz',
            panelRefName: 'panel_bizz',
          },
        ],
        timeRestore: false,
        version: 3,
      };

      const response = await supertest
        .post(PUBLIC_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: dashboardAttrs,
          references: [
            {
              name: 'bizz:panel_bizz',
              type: 'visualization',
              id: 'my-saved-object',
            },
          ],
        });

      expect(response.status).to.be(200);
      expect(response.body.item.attributes.panels).to.be.an('array');
      expect(response.body.item.attributes.panels[0].embeddableConfig.id).to.eql('bizz');
    });

    it('in a defined space', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const dashboardAttrs: DashboardAttributes = {
        title,
        description: '',
        kibanaSavedObjectMeta: {},
        panels: [],
        timeRestore: false,
        version: 3,
      };

      const spaceId = 'space-1';

      const response = await supertest
        .post(`/s/${spaceId}${PUBLIC_API_PATH}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: dashboardAttrs,
          spaces: [spaceId],
        });

      expect(response.status).to.be(200);
      expect(response.body.item.namespaces).to.eql([spaceId]);
    });

    it('return error if provided id already exists', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;
      // id is a saved object loaded by the kbn_archiver
      const id = 'be3733a0-9efe-11e7-acb3-3dab96693fab';

      const dashboardAttrs: DashboardAttributes = {
        title,
        description: '',
        kibanaSavedObjectMeta: {},
        panels: [],
        timeRestore: false,
        version: 3,
      };

      await supertest
        .post(`${PUBLIC_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: dashboardAttrs,
        });

      const response = await supertest
        .post(`${PUBLIC_API_PATH}/${id}`)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send({
          attributes: dashboardAttrs,
        });

      expect(response.status).to.be(409);
      expect(response.body.message).to.be(
        'A dashboard with saved object ID be3733a0-9efe-11e7-acb3-3dab96693fab already exists.'
      );
    });
  });
}
