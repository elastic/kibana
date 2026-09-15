/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Maximum lengths for schema.string() fields in Fleet REST specs and model schemas.
// These guard against unbounded-input DoS (CWE-770).  Adjust a limit here and the
// change propagates to every schema that imports it.

/** Identifiers: UUIDs, Saved Object IDs, preconfigured policy IDs, short opaque tokens. */
export const FLEET_SCHEMA_ID_MAX_LENGTH = 512;

/** Human-readable names: policy names, package names, integration names. */
export const FLEET_SCHEMA_NAME_MAX_LENGTH = 255;

/** URLs: host URLs, proxy URLs, source URIs. */
export const FLEET_SCHEMA_URL_MAX_LENGTH = 2048;

/** KQL filter strings and other long free-text inputs (descriptions, error messages). */
export const FLEET_SCHEMA_LONG_TEXT_MAX_LENGTH = 10000;

/** PEM-encoded SSL certificates, certificate-authority bundles, and private keys. */
export const FLEET_SCHEMA_CERT_MAX_LENGTH = 100_000;
