/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** PoC (ingest-dev#10467): the generic "Configure data streams" form, a route on the modal's memory router. */
export const ONBOARDING_POC_BASE_PATH = '/onboarding-poc';
export const ONBOARDING_POC_ROUTE = `${ONBOARDING_POC_BASE_PATH}/:packageName`;

export const getOnboardingPocPath = (packageName: string) =>
  `${ONBOARDING_POC_BASE_PATH}/${packageName}`;

/** The only package the PoC form is wired to from the catalogue. */
export const ONBOARDING_POC_PACKAGE = 'nginx';
