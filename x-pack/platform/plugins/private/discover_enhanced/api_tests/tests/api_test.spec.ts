/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, expect } from '@kbn/scout';

apiTest.describe('Elastic Cloud', () => {
  apiTest('should return the client location', async ({ request }) => {
    const response = await request.get('https://www.elastic.co/gdpr-data');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toContain({ city: 'Berlin' });
  });
});
