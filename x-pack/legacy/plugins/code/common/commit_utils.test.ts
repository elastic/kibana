/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseCommitMessage } from './commit_utils';

describe('Commit Utils', () => {
  describe('parseCommitMessage', () => {
    it('parses the summary from a commit message', () => {
      const message = "This is a summary\n\nAnd here's the body";
      const { summary } = parseCommitMessage(message);

      expect(summary).toEqual('This is a summary');
    });

    it('parses the body from a commit message', () => {
      const message = "This is a summary\n\nAnd here's the body";
      const { body } = parseCommitMessage(message);

      expect(body).toEqual("And here's the body");
    });

    it('includes the second line as body, if erroneously present', () => {
      const messageWithSecondLine = 'summary\nsecond\ndescription';
      const { summary, body } = parseCommitMessage(messageWithSecondLine);

      expect(summary).toEqual('summary');
      expect(body).toEqual('second\ndescription');
    });
  });
});
