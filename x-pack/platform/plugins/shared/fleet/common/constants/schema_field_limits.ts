/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Maximum lengths for schema.string() fields in Fleet REST specs and model schemas.
// These guard against unbounded-input DoS (CWE-770).  Adjust a limit here and the
// change propagates to every schema that imports it.

/**
 * Machine-generated short text: ISO 8601 timestamps, semver and version-condition
 * strings, ES duration strings, and fixed enum values.
 *
 * Identifiers are deliberately absent here: UUIDs, Saved Object IDs, API key IDs and
 * policy/output/action IDs use the platform `schema.savedObjectId()` helper instead, so
 * they share the limit core applies to every Saved Object ID.
 */
export const FLEET_SCHEMA_SHORT_TEXT_MAX_LENGTH = 512;

/** Human-readable names: policy names, package names, integration names. */
export const FLEET_SCHEMA_NAME_MAX_LENGTH = 255;

/**
 * Data stream namespaces and namespace prefixes. Matches the 100 byte ceiling that
 * `isValidNamespace` already enforces, so this only makes the existing rule visible to
 * the generated OAS and to CodeQL.
 *
 * Not for the `namespaces` field on agents, agent actions and uninstall tokens: despite
 * the name, those hold Kibana Space IDs and use `schema.spaceId()`.
 */
export const FLEET_SCHEMA_NAMESPACE_MAX_LENGTH = 100;

/** URLs: host URLs, proxy URLs, source URIs. */
export const FLEET_SCHEMA_URL_MAX_LENGTH = 2048;

/** KQL filter strings and other long free-text inputs (descriptions, error messages). */
export const FLEET_SCHEMA_LONG_TEXT_MAX_LENGTH = 10000;

/** PEM-encoded SSL certificates, certificate-authority bundles, and private keys. */
export const FLEET_SCHEMA_CERT_MAX_LENGTH = 100_000;
