/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as yaml from 'js-yaml';

import { DEFAULT_SPACE_BUTTON, PASSWORD, USERNAME } from './selectors';
import { LOGIN_PAGE } from '../urls';

/* eslint-disable spaced-comment */
/// <reference types="cypress"/>

/**
 * The `username` and `password` values in the `elasticsearch` section of this
 * file will be used to login to Kibana
 */
const KIBANA_DEV_YML_PATH = '../../../../config/kibana.dev.yml';

/** Wait this long for the login page wait (ms) */
const USERNAME_TIMEOUT = 10 * 1000;

export const login = () => {
  // read the login details
  cy.readFile(KIBANA_DEV_YML_PATH).then(kibanaDevYml => {
    const config = yaml.safeLoad(kibanaDevYml);

    cy.log(
      `Logging into Kibana with the \`username\` and \`password\` from the \`elasticsearch\` section from \`${KIBANA_DEV_YML_PATH}\``
    );

    cy.visit(LOGIN_PAGE);

    cy.get(USERNAME, { timeout: USERNAME_TIMEOUT }).type(config.elasticsearch.username);
    cy.get(PASSWORD).type(`${config.elasticsearch.password}{enter}`, {
      log: false,
    });

    cy.get(DEFAULT_SPACE_BUTTON).click();
  });
};
