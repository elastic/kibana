/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ getService }) {
  const remote = getService('remote');

  describe('suite2', () => {
    before(async () => {
      process.send({
        name: 'before suite2',
        size: await remote.getWindowSize(),
      });

      await remote.setWindowSize(900, 900);
    });

    it('has the right window size', async () => {
      process.send({
        name: 'in suite2',
        size: await remote.getWindowSize(),
      });
    });

    after(async () => {
      process.send({
        name: 'after suite2',
        size: await remote.getWindowSize(),
      });
    });
  });
}
