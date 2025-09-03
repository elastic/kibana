/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDeploymentId } from './extract_deployment_id';

describe('cloud extract deployment ID', () => {
  const cloudIdWithDeploymentName =
    'cloud_message_test:ZXUtd2VzdC0yLmF3cy5jbG91ZC5lcy5pbyQ4NWQ2NjZmMzM1MGM0NjllOGMzMjQyZDc2YTdmNDU5YyQxNmI1ZDM2ZGE1Mzk0YjlkYjIyZWJlNDk1OWY1OGQzMg==';

  const cloudIdWithOutDeploymentName =
    ':ZXUtd2VzdC0yLmF3cy5jbG91ZC5lcy5pbyQ4NWQ2NjZmMzM1MGM0NjllOGMzMjQyZDc2YTdmNDU5YyQxNmI1ZDM2ZGE1Mzk0YjlkYjIyZWJlNDk1OWY1OGQzMg==';

  const badCloudId = 'cloud_message_test:this_is_not_a_base64_string';

  it('should extract cloud ID when deployment name is present', () => {
    expect(extractDeploymentId(cloudIdWithDeploymentName)).toBe('85d666f3350c469e8c3242d76a7f459c');
  });

  it('should extract cloud ID when deployment name is not present', () => {
    expect(extractDeploymentId(cloudIdWithOutDeploymentName)).toBe(
      '85d666f3350c469e8c3242d76a7f459c'
    );
  });

  it('should fail to extract cloud ID', () => {
    expect(extractDeploymentId(badCloudId)).toBe(null);
  });
});
