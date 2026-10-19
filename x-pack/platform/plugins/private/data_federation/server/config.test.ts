/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config, DEFAULT_AWS_CLOUDFORMATION_TEMPLATE_URL } from './config';

describe('awsCloudFormationTemplateUrl config', () => {
  it('defaults to the published template', () => {
    expect(config.schema.validate({}).awsCloudFormationTemplateUrl).toBe(
      DEFAULT_AWS_CLOUDFORMATION_TEMPLATE_URL
    );
  });

  it('accepts another HTTPS URL', () => {
    const url = 'https://bucket.s3.amazonaws.com/aws/v1/datasource-cft.yml';

    expect(
      config.schema.validate({ awsCloudFormationTemplateUrl: url }).awsCloudFormationTemplateUrl
    ).toBe(url);
  });

  // A bad value has to fail at startup instead of producing a broken launch link.
  it.each(['', 'http://bucket.s3.amazonaws.com/datasource-cft.yml', 'not a url'])(
    'rejects %p',
    (value) => {
      expect(() => config.schema.validate({ awsCloudFormationTemplateUrl: value })).toThrow();
    }
  );
});
