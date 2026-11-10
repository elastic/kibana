/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { exportReview } from '../src/export_review';

const PACKAGE_DIR = Path.resolve(__dirname, '..');

run(
  async ({ log, flags }) => {
    const capturesDir = Path.resolve(
      typeof flags.captures === 'string' && flags.captures
        ? flags.captures
        : Path.join(PACKAGE_DIR, 'captures')
    );
    const outDir = Path.resolve(
      typeof flags.out === 'string' && flags.out ? flags.out : Path.join(PACKAGE_DIR, 'review')
    );

    const index = exportReview({ capturesDir, outDir });
    log.success(
      `Exported ${index.cases.length} panels to ${Path.relative(process.cwd(), outDir) || '.'}`
    );
    if (index.missing_screenshots.length > 0) {
      log.warning(
        `${index.missing_screenshots.length} screenshots are missing; run the capture to write them`
      );
    }
  },
  {
    description: "Exports the corpus captures for Isomer's visual review.",
    flags: {
      string: ['captures', 'out'],
      help: `
        --captures  The capture directory. Defaults to this package's captures.
        --out       Where to write the export (replaced). Defaults to this package's review/.
      `,
    },
  }
);
