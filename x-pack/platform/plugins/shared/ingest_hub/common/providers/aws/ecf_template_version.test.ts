/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ECF_FALLBACK_TEMPLATE_VERSION,
  buildEcfTemplateUrl,
  parseEcfTemplateVersion,
} from './ecf_template_version';

// ── buildEcfTemplateUrl ───────────────────────────────────────────────────────

describe('buildEcfTemplateUrl()', () => {
  it('embeds the version in a v1/v{version}/ path segment', () => {
    const url = buildEcfTemplateUrl('otel_logs-cloudformation.yaml', '1.10.0');
    expect(url).toBe(
      'https://edot-cloud-forwarder.s3.amazonaws.com/v1/v1.10.0/cloudformation/otel_logs-cloudformation.yaml'
    );
  });

  it('uses the provided template filename verbatim', () => {
    const url = buildEcfTemplateUrl('ecs_logs-cloudformation.yaml', '2.0.0');
    expect(url).toContain('ecs_logs-cloudformation.yaml');
    expect(url).toContain('v1/v2.0.0/');
  });

  it('never contains "latest" in the path when a concrete version is given', () => {
    const url = buildEcfTemplateUrl('otel_logs-cloudformation.yaml', ECF_FALLBACK_TEMPLATE_VERSION);
    expect(url).not.toContain('latest');
  });

  it('points to the ECF S3 bucket', () => {
    const url = buildEcfTemplateUrl('otel_logs-cloudformation.yaml', '1.0.0');
    expect(url).toMatch(/^https:\/\/edot-cloud-forwarder\.s3\.amazonaws\.com\//);
  });
});

// ── parseEcfTemplateVersion ───────────────────────────────────────────────────

describe('parseEcfTemplateVersion()', () => {
  const TEMPLATE_EXCERPT = `
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >-
  Elastic Cloud Forwarder – OTel-native multi-signal log collection.
Metadata:
  AWS::ServerlessRepo::Application:
    Name: edot-cloud-forwarder-otel
    Description: Elastic Cloud Forwarder OTel multi-signal log collection
    Author: elastic
    SemanticVersion: 1.10.0
    HomePageUrl: https://www.elastic.co/docs/reference/opentelemetry/edot-cloud-forwarder/aws
Parameters:
  OTLPEndpoint:
    Type: String
`;

  it('extracts the version from a realistic template excerpt', () => {
    expect(parseEcfTemplateVersion(TEMPLATE_EXCERPT)).toBe('1.10.0');
  });

  it('returns the version when SemanticVersion is at the start of a line', () => {
    const yaml = 'SemanticVersion: 2.5.1\nOtherField: foo';
    expect(parseEcfTemplateVersion(yaml)).toBe('2.5.1');
  });

  it('handles leading whitespace before SemanticVersion', () => {
    const yaml = '    SemanticVersion: 0.9.0';
    expect(parseEcfTemplateVersion(yaml)).toBe('0.9.0');
  });

  it('returns undefined when SemanticVersion is absent', () => {
    const yaml = 'AWSTemplateFormatVersion: "2010-09-09"\nDescription: No version here';
    expect(parseEcfTemplateVersion(yaml)).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(parseEcfTemplateVersion('')).toBeUndefined();
  });

  it('does not match a partial semver (e.g. "1.10" without patch)', () => {
    // The regex requires exactly x.y.z — a two-part version must not match.
    const yaml = 'SemanticVersion: 1.10';
    expect(parseEcfTemplateVersion(yaml)).toBeUndefined();
  });

  it('does not match SemanticVersion that is not at the start of a line', () => {
    // Inline occurrence — the `^` anchor plus `m` flag should not match mid-line.
    const yaml = 'key: SemanticVersion: 3.0.0';
    expect(parseEcfTemplateVersion(yaml)).toBeUndefined();
  });
});
