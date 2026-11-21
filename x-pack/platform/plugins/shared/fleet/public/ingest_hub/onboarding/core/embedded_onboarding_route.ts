/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Where the onboarding wizard lives on an embedding surface's router. Integration cards that
 * open a wizard instead of the add-integration page push this path, so the catalogue does not
 * have to know what renders there.
 */
export const EMBEDDED_ONBOARDING_BASE_PATH = '/onboarding';
export const EMBEDDED_ONBOARDING_ROUTE = `${EMBEDDED_ONBOARDING_BASE_PATH}/:integrationId`;

export const getEmbeddedOnboardingPath = (integrationId: string) =>
  `${EMBEDDED_ONBOARDING_BASE_PATH}/${integrationId}`;
