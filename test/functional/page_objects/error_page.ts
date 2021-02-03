/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../ftr_provider_context';

export function ErrorPageProvider({ getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);

  class ErrorPage {
    public async expectForbidden() {
      const messageText = await common.getBodyText();
      expect(messageText).to.contain('You do not have permission to access the requested page');
    }

    public async expectNotFound() {
      const messageText = await common.getJsonBodyText();
      expect(messageText).to.eql(
        JSON.stringify({
          statusCode: 404,
          error: 'Not Found',
          message: 'Not Found',
        })
      );
    }
  }

  return new ErrorPage();
}
