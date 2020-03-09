/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const esArchiverLoadFolder = () => {
  cy.exec(
    `node ../../../../scripts/es_archiver load empty_kibana --dir ../../../test/siem_cypress/es_archives --config ../../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const esArchiverResetKibana = () => {
  cy.exec(
    `node ../../../../scripts/es_archiver empty-kibana-index --config ../../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};
