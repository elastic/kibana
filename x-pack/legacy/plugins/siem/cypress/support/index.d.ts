/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare namespace Cypress {
  interface Chainable {
    logout(): Chainable<Element>;

    loginRequest(username: string, password: string): Chainable<Element>;

    loginViaEnvironmentCredentials(): Chainable<Element>;

    loginViaConfig(): Chainable<Element>;

    login(): Chainable<Element>;

    visitSiem(url: string): Chainable<Element>;
  }
}
