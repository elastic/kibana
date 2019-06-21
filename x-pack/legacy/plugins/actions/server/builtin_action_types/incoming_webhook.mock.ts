/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// A mock version of the slacks IncomingWebhook API which succeeds or fails
// based on the the content of the message passed.
export class MockIncomingWebhook {
  async send(message: string): Promise<any> {
    if (message == null) throw new Error('message property required in parameter');

    const failureMatch = message.match(/^failure: (.*)$/);
    if (failureMatch != null) {
      const failMessage = failureMatch[1];
      throw new Error(`mockIncomingWebhook failure: ${failMessage}`);
    }

    return {
      text: `mockIncomingWebhook success: ${message}`,
    };
  }
}
