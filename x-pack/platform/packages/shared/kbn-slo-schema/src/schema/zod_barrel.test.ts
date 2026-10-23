/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as schemaBarrel from '.';
import * as common from './common';
import * as duration from './duration';
import * as guards from './guards';
import * as health from './health';
import * as indicators from './indicators';
import * as settings from './settings';
import * as slo from './slo';
import * as sloTemplate from './slo_template';
import * as timeWindow from './time_window';

const zodSchemas = {
  ...common,
  ...duration,
  ...guards,
  ...health,
  ...indicators,
  ...settings,
  ...slo,
  ...sloTemplate,
  ...timeWindow,
};

// Exported under their final name without the suffix: a helper, and a mapping
// that never had a suffixed twin.
const UNSUFFIXED_EXPORTS = new Set(['is', 'timesliceMetricComparatorMapping']);

describe('zod schema barrel', () => {
  it('re-exports every zod twin with the temporary Zod suffix', () => {
    // The barrel renames each export by hand, so a schema added to a module
    // without a matching entry would silently never reach package consumers.
    const missing = Object.keys(zodSchemas).filter(
      (name) => !UNSUFFIXED_EXPORTS.has(name) && !(`${name}Zod` in schemaBarrel)
    );
    expect(missing).toEqual([]);
  });

  it('exports the is guard unsuffixed', () => {
    expect(schemaBarrel.is).toBe(zodSchemas.is);
  });
});
