/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-field route validation bounds for cloud HTTP schemas.
 *
 * `next` uses 2048 to match the generous client-variable string precedent from
 * kibana#278623 (`userAgent`) and the lower end of the 2048–4096 review range.
 * Observed in-repo redirects are short internal paths (≪100 chars). 4096 would
 * still sit under Node's default ~16KB header ceiling but would weaken DoS
 * hardening without evidence of longer legitimate `next` values.
 *
 * Deployment bounds follow Cloud API shapes. Onboarding tokens stay at 1024
 * (reviewer confirmed that bound is fine / generous).
 */

/** Internal redirect target for `/app/cloud/onboarding` (`parseNextURL`). */
export const MAX_CLOUD_ONBOARDING_NEXT_LENGTH = 2048;

/** Opaque Cloud onboarding token — keep the original generous bound. */
export const MAX_CLOUD_ONBOARDING_TOKEN_LENGTH = 1024;

/** Cloud deployment id (exactly 32 safe alphanumerics in Cloud DeploymentId). */
export const MAX_CLOUD_DEPLOYMENT_ID_LENGTH = 64;

/** Cloud deployment display name (Cloud MAX_DEPLOYMENT_NAME_LENGTH = 255). */
export const MAX_CLOUD_DEPLOYMENT_NAME_LENGTH = 256;
