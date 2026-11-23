/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteIntegrations } from '../tasks/integrations';
import { SETTINGS } from '../screens/integrations';
import { LOADING_SPINNER, CONFIRM_MODAL } from '../screens/navigation';
import { ASSETS_PAGE } from '../screens/fleet';
import { cleanupAgentPolicies } from '../tasks/cleanup';
import { request } from '../tasks/common';
import { login } from '../tasks/login';

interface Asset {
  type: string;
  expected: string[];
  links?: Array<{
    text: string;
    expectedEsApi: string;
    expectedResponseStatus: number;
    expectedBody?: (resp: any) => void;
  }>;
}
const integrationWithML = 'lmd';
const destinationIndex = 'ml-rdp-lmd';
const assets: Asset[] = [
  {
    type: 'index_template',
    expected: ['logs-lmd.pivot_transform-template'],
    links: [
      {
        text: 'logs-lmd.pivot_transform-template',
        expectedEsApi:
          '/api/index_management/index_templates/logs-lmd.pivot_transform-template?legacy=false',
        expectedResponseStatus: 200,
        expectedBody: (resp) => {
          const body = resp.body;
          expect(body.composedOf).to.deep.equal([
            'logs-lmd.pivot_transform-template@package',
            'logs-lmd.pivot_transform-template@custom',
          ]);
          expect(body.indexPatterns).to.deep.equal([destinationIndex]);
        },
      },
    ],
  },
  {
    type: 'component_template',
    expected: [
      'logs-lmd.pivot_transform-template@custom',
      'logs-lmd.pivot_transform-template@package',
    ],
    links: [
      {
        text: 'logs-lmd.pivot_transform-template@package',
        expectedEsApi:
          '/api/index_management/component_templates/logs-lmd.pivot_transform-template%40package',
        expectedResponseStatus: 200,
      },
      {
        text: 'logs-lmd.pivot_transform-template@custom',
        expectedEsApi:
          '/api/index_management/component_templates/logs-lmd.pivot_transform-template%40custom',
        // @custom should be defined by user if needed
        // therefore should not exist when package is first installed
        // but it should be defined in the index template
        expectedResponseStatus: 404,
      },
    ],
  },
  {
    type: 'transform',
    expected: ['logs-lmd.pivot_transform'],
  },
  {
    type: 'ml-module',
    expected: ['Lateral Movement Detection'],
  },
  {
    type: 'index',
    expected: [destinationIndex],
  },
];

describe('Assets - Real API for integration with ML and transforms', () => {
  before(() => {
    login();

    cleanupAgentPolicies();
    deleteIntegrations();
  });

  after(() => {});

  const expandAssetPanelIfNeeded = (asset: Asset) => {
    cy.get(`[aria-controls="${asset.type}"]`)
      .first()
      .then(($button) => {
        if ($button.attr('aria-expanded') === 'false') {
          cy.wrap($button).click();
          cy.wrap($button).should('have.attr', 'aria-expanded', 'true');
        }
      });
  };
  it('should install integration with ML module & transforms', () => {
    cy.visit(`/app/integrations/detail/${integrationWithML}/settings`);

    cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).click();
    cy.get('.euiCallOut').contains('This action will install 4 assets');
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
    cy.getBySel(LOADING_SPINNER).should('not.exist');
    cy.getBySel(ASSETS_PAGE.TAB).click();

    // Verify that assets associated with ML and transform were created
    assets.forEach((asset) => {
      asset.expected.forEach((expectedItem) => {
        expandAssetPanelIfNeeded(asset);
        cy.getBySel(ASSETS_PAGE.getContentId(asset.type)).should('contain.text', expectedItem);
      });

      if (asset.links) {
        // If asset is a clickable link, click on link and perform neccesary assertions
        // then navigate back
        asset.links.forEach((link) => {
          expandAssetPanelIfNeeded(asset);
          cy.contains('a', link.text).click();
          cy.intercept(link.expectedEsApi, (req) => {
            req.reply((res) => {
              expect(res.statusCode).to.equal(link.expectedResponseStatus);
              if (link.expectedBody) {
                link.expectedBody(res);
              }
            });
          });
          cy.go('back');
        });
      }
    });

    // Verify by API that destination index was created and is healthy
    request({
      method: 'GET',
      url: `/internal/index_management/indices/${destinationIndex}`,
      headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': '1' },
    }).then((response) => {
      expect(response.status).to.equal(200);
    });

    // Verify by API that transform was created and is healthy
    cy.getBySel(ASSETS_PAGE.getContentId('transform'))
      .invoke('text')
      .then((text) => {
        // We need to grab the text to get the real transformId
        // depending on package version
        const transformId = text.trim();
        request({
          method: 'GET',
          url: `/internal/transform/transforms/${transformId}/_stats`,
          headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': '1' },
        }).then((resp) => {
          const response = resp as unknown as Cypress.Response<{
            transforms: Array<{ health: { status: string } }>;
          }>;
          expect(response.status).to.equal(200);
          expect(response.body.transforms[0].health.status).to.equal('green');
        });
      });
  });
});
