/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const archiverLoadEmptyKibana = () => {
  cy.exec(
    `node ../../../../scripts/es_archiver empty_kibana load empty--dir ../../../test/siem_cypress/archives --config ../../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const archiverLoad = (folder: string) => {
  cy.exec(
    `node ../../../../scripts/es_archiver load ${folder} --dir ../../../test/siem_cypress/archives --config ../../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const archiverUnload = (folder: string) => {
  cy.exec(
    `node ../../../../scripts/es_archiver unload ${folder} --dir ../../../test/siem_cypress/archives --config ../../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const archiverUnloadEmptyKibana = () => {
  cy.exec(
    `node ../../../../scripts/es_archiver unload empty_kibana empty--dir ../../../test/siem_cypress/archives --config ../../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};

export const archiverResetKibana = () => {
  cy.exec(
    `node ../../../../scripts/es_archiver empty-kibana-index --config ../../../../test/functional/config.js --es-url ${Cypress.env(
      'ELASTICSEARCH_URL'
    )} --kibana-url ${Cypress.config().baseUrl}`
  );
};
