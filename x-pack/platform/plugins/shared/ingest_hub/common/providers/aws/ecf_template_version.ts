/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pinned ECF template version used as a fallback when the live S3 fetch fails or is unavailable
 * (e.g. air-gapped environments). Bump this when ECF publishes a new release.
 *
 * To verify: `${buildEcfTemplateUrl('<file>', ECF_FALLBACK_TEMPLATE_VERSION)}` must return 200.
 */
export const ECF_FALLBACK_TEMPLATE_VERSION = '1.10.0';

/**
 * Maximum length of an AWS CloudFormation stack name (AWS hard limit).
 * Shared between the UI validation regex and the Fleet saved-object schema.
 */
export const ECF_STACK_NAME_MAX_LENGTH = 128;

/** ECF S3 bucket base URL. */
const ECF_S3_BASE = 'https://edot-cloud-forwarder.s3.amazonaws.com';

/**
 * Builds a version-pinned S3 URL for an ECF CloudFormation template file.
 * Substitutes `v1/latest/` with `v1/v{version}/` so Kibana records which concrete
 * ECF release was deployed rather than a mutable alias.
 */
export const buildEcfTemplateUrl = (templateFile: string, version: string): string =>
  `${ECF_S3_BASE}/v1/v${version}/cloudformation/${templateFile}`;

/**
 * Extracts the ECF semantic version from a raw CloudFormation template YAML string.
 *
 * Uses a regex rather than a full YAML parser because the templates contain `!Ref` / `!Sub`
 * custom tags that most parsers reject, and we only need one scalar.
 *
 * Returns `undefined` when the field is absent or the string is empty.
 */
export const parseEcfTemplateVersion = (templateYaml: string): string | undefined => {
  const match = /^\s*SemanticVersion:\s*(\d+\.\d+\.\d+)/m.exec(templateYaml);
  return match?.[1];
};
