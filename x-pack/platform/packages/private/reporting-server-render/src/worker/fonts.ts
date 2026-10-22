/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Kibana ships its own Inter and Elastic UI Numeric fonts for the core rendering service
 * (`src/core/packages/apps/server-internal`, see `fonts.tsx`). Resolved from the repo root
 * rather than a relative `../..` walk: the previous relative path was one level too deep and
 * silently registered nothing.
 */
export const FONT_ASSETS_DIR = Path.join(
  REPO_ROOT,
  'src/core/packages/apps/server-internal/assets/fonts'
);

/** The Inter faces EUI's type scale uses, and the Elastic UI Numeric variable font. */
export const KIBANA_FONT_FILES = [
  { family: 'Inter', weight: 400, file: Path.join('inter', 'Inter-Regular.woff2') },
  { family: 'Inter', weight: 500, file: Path.join('inter', 'Inter-Medium.woff2') },
  { family: 'Inter', weight: 600, file: Path.join('inter', 'Inter-SemiBold.woff2') },
  { family: 'Inter', weight: 700, file: Path.join('inter', 'Inter-Bold.woff2') },
  {
    family: 'Elastic UI Numeric',
    weight: undefined,
    file: Path.join('elastic_ui_numeric', 'ElasticUINumeric-Variable.woff2'),
  },
] as const;

/**
 * Wide-coverage fallback for scripts Inter does not cover (CJK in particular). Kibana already
 * ships it for the Chromium PDF path; reused from there rather than copied (18MB).
 */
export const FALLBACK_FONT = {
  family: 'Noto Sans CJK TC',
  file: Path.join(
    REPO_ROOT,
    'x-pack/platform/plugins/shared/screenshotting/server/assets/fonts/noto/NotoSansCJKtc-Regular.ttf'
  ),
} as const;
