/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  overrides: [
    {
      files: ['public/**/*.tsx'],
      rules: {
        'no-restricted-syntax': [
          'warn',
          {
            selector:
              "JSXOpeningElement[name.name=/^Eui(Button|ButtonEmpty|ButtonIcon|ButtonGroup|Link|ContextMenuItem|Tab)$/]:not(:has(JSXAttribute[name.name='data-ebt-action'])):not(:has(JSXAttribute[name.name='data-ebt-skip']))",
            message:
              'EUI interactive elements must have a data-ebt-action attribute for telemetry tracking. Add data-ebt-skip to intentionally opt out.',
          },
        ],
      },
    },
  ],
};
