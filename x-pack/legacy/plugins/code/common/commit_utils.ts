/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const parseCommitMessage: (message: string) => { summary: string; body: string } = message => {
  const [summary, ...rest] = message.split('\n');
  const body = rest.join('\n').trim();

  return { summary, body };
};

export { parseCommitMessage };
