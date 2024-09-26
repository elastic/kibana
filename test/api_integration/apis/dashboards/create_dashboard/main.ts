/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
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
        panels: [],
        timeRestore: false,
        options: {
          hidePanelTitles: false,
          useMargins: true,
          syncColors: true,
          syncTooltips: true,
          syncCursor: true,
        },
        version: 3,
      };

      const response = await supertest.post('/api/dashboards/create').send({
        attributes: dashboardAttrs,
        references: [],
      });

      expect(response.status).to.be(200);
    });
  });
}
