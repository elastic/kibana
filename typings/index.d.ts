/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare module 'axios/lib/adapters/xhr';

// Ambient shims for deep imports into @elastic/eui submodules. Importing from
// the `@elastic/eui` barrel evaluates the entire EUI module graph (React,
// Emotion, every component) and pins ~17 MB on the idle Kibana server heap.
// Deep-importing the specific submodule loads only that file and its narrow
// transitive deps — no React. EUI ships a single bundled `eui.d.ts` with no
// per-file `.d.ts` shadows, so deep paths are untyped by default; these shims
// re-export the already-typed symbols from the bundled types so we stay in
// lock-step with EUI's public type surface (no drift, no manual signatures).
//
// Long-term fix: ask the EUI team to emit per-file declarations so this
// ambient shim can be deleted.

declare module '@elastic/eui/lib/services/color/eui_palettes' {
  export {
    euiPaletteColorBlind,
    euiPaletteColorBlindBehindText,
    euiPaletteForStatus,
    euiPaletteForTemperature,
    euiPaletteComplementary,
    euiPaletteRed,
    euiPaletteGreen,
    euiPaletteSkyBlue,
    euiPaletteYellow,
    euiPaletteOrange,
    euiPaletteCool,
    euiPaletteWarm,
    euiPaletteGray,
    EuiPaletteColorBlindProps,
    EuiPaletteRotationProps,
    EuiPaletteCommonProps,
  } from '@elastic/eui';
}

declare module '@elastic/eui/lib/services/color/visualization_colors' {
  export { VISUALIZATION_COLORS, DEFAULT_VISUALIZATION_COLOR } from '@elastic/eui';
}

declare module 'find-cypress-specs';

declare module '@cypress/grep' {
  export function register(): void;
}

declare module '@cypress/grep/plugin' {
  interface CypressConfigOptions {
    env?: Record<string, unknown>;
    specPattern?: string | string[];
    excludeSpecPattern?: string | string[];
  }
  export function plugin(config: CypressConfigOptions): CypressConfigOptions;
}
