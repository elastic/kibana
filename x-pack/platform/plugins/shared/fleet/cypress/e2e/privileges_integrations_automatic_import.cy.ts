/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from '../tasks/privileges';
import {
  deleteUsersAndRoles,
  getIntegrationsAutoImportRole,
  createUsersAndRoles,
  AutomaticImportConnectorNoneUser,
  AutomaticImportConnectorNoneRole,
  AutomaticImportConnectorAllUser,
  AutomaticImportConnectorAllRole,
  AutomaticImportConnectorReadUser,
  AutomaticImportConnectorReadRole,
} from '../tasks/privileges';
import { loginWithUserAndWaitForPage, logout } from '../tasks/login';
import {
  ASSISTANT_BUTTON,
  CONNECTOR_BEDROCK,
  CONNECTOR_GEMINI,
  CONNECTOR_OPENAI,
  CREATE_AUTOMATIC_IMPORT,
  CREATE_INTEGRATION_LANDING_PAGE,
  CREATE_INTEGRATION_UPLOAD,
  MISSING_PRIVILEGES,
  UPLOAD_PACKAGE_LINK,
} from '../screens/integrations_automatic_import';

describe('When the user does not have enough previleges for Integrations', () => {
  const runs = [
    { fleetRole: 'read', integrationsRole: 'read' },
    { fleetRole: 'read', integrationsRole: 'all' },
    { fleetRole: 'all', integrationsRole: 'read' },
  ];

  runs.forEach(function (run) {
    describe(`When the user has '${run.fleetRole}' role for fleet and '${run.integrationsRole}' role for Integrations`, () => {
      const automaticImportIntegrRole = getIntegrationsAutoImportRole({
        fleetv2: [run.fleetRole], // fleet
        fleet: [run.integrationsRole], // integrations
      });
      const AutomaticImportIntegrUser: User = {
        username: 'automatic_import_integrations_read_user',
        password: 'password',
        roles: [automaticImportIntegrRole.name],
      };

      before(() => {
        createUsersAndRoles([AutomaticImportIntegrUser], [automaticImportIntegrRole]);
      });

      afterEach(() => {
        logout();
      });

      after(() => {
        deleteUsersAndRoles([AutomaticImportIntegrUser], [automaticImportIntegrRole]);
      });

      it('Create Assistant is not accessible if user has read role in integrations', () => {
        loginWithUserAndWaitForPage(CREATE_AUTOMATIC_IMPORT, AutomaticImportIntegrUser);
        cy.getBySel(MISSING_PRIVILEGES).should('exist');
      });

      it('Create upload is not accessible if user has read role in integrations', () => {
        loginWithUserAndWaitForPage(CREATE_INTEGRATION_UPLOAD, AutomaticImportIntegrUser);
        cy.getBySel(MISSING_PRIVILEGES).should('exist');
      });
    });
  });
});

describe('When the user has All permissions for Integrations and No permissions for actions', () => {
  before(() => {
    createUsersAndRoles([AutomaticImportConnectorNoneUser], [AutomaticImportConnectorNoneRole]);
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsersAndRoles([AutomaticImportConnectorNoneUser], [AutomaticImportConnectorNoneRole]);
  });

  it('Create Assistant is not accessible but upload is accessible', () => {
    loginWithUserAndWaitForPage(CREATE_INTEGRATION_LANDING_PAGE, AutomaticImportConnectorNoneUser);
    cy.getBySel(ASSISTANT_BUTTON).should('not.exist');
    cy.getBySel(UPLOAD_PACKAGE_LINK).should('exist');
  });
});

describe('When the user has All permissions for Integrations and read permissions for actions', () => {
  before(() => {
    createUsersAndRoles([AutomaticImportConnectorReadUser], [AutomaticImportConnectorReadRole]);
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsersAndRoles([AutomaticImportConnectorReadUser], [AutomaticImportConnectorReadRole]);
  });

  it('Create Assistant is not accessible but upload is accessible', () => {
    loginWithUserAndWaitForPage(CREATE_INTEGRATION_LANDING_PAGE, AutomaticImportConnectorReadUser);
    cy.getBySel(ASSISTANT_BUTTON).should('exist');
    cy.getBySel(UPLOAD_PACKAGE_LINK).should('exist');
  });

  it('Create Assistant is accessible but execute connector is not accessible', () => {
    loginWithUserAndWaitForPage(CREATE_AUTOMATIC_IMPORT, AutomaticImportConnectorReadUser);
    cy.getBySel(CONNECTOR_BEDROCK).should('not.exist');
    cy.getBySel(CONNECTOR_OPENAI).should('not.exist');
    cy.getBySel(CONNECTOR_GEMINI).should('not.exist');
  });
});

describe('When the user has All permissions for Integrations and All permissions for actions', () => {
  before(() => {
    createUsersAndRoles([AutomaticImportConnectorAllUser], [AutomaticImportConnectorAllRole]);
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsersAndRoles([AutomaticImportConnectorAllUser], [AutomaticImportConnectorAllRole]);
  });

  it('Create Assistant is not accessible but upload is accessible', () => {
    loginWithUserAndWaitForPage(CREATE_AUTOMATIC_IMPORT, AutomaticImportConnectorAllUser);
    cy.getBySel(CONNECTOR_BEDROCK).should('exist');
    cy.getBySel(CONNECTOR_OPENAI).should('exist');
    cy.getBySel(CONNECTOR_GEMINI).should('exist');
  });
});
