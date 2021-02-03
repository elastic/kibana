/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { readFileSync } from 'fs';

export function analyzeWithAxe(context, options, callback) {
  Promise.resolve()
    .then(() => {
      if (window.axe) {
        window.axe.configure({
          rules: [
            {
              id: 'scrollable-region-focusable',
              selector: '[data-skip-axe="scrollable-region-focusable"]',
            },
            {
              id: 'aria-required-children',
              selector: '[data-skip-axe="aria-required-children"] > *',
            },
            {
              id: 'label',
              selector: '[data-test-subj="comboBoxSearchInput"] *',
            },
            {
              id: 'aria-roles',
              selector: '[data-test-subj="comboBoxSearchInput"] *',
            },
          ],
        });
        return window.axe.run(context, options);
      }

      // return a false report to trigger analyzeWithAxeWithClient
      return false;
    })
    .then(
      (result) => callback({ result }),
      (error) => {
        callback({
          error: {
            message: error.message,
            stack: error.stack,
          },
        });
      }
    );
}

export const analyzeWithAxeWithClient = `
  ${readFileSync(require.resolve('axe-core/axe.js'), 'utf8')}

  return (${analyzeWithAxe.toString()}).apply(null, arguments);
`;
