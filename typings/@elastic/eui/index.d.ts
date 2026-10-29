/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove once typescript definitions are in EUI

declare module '@elastic/eui/lib/services' {
  export const RIGHT_ALIGNMENT: any;
}

// POC: EuiLoadingElasticRing ships in local EUI optimize/es before eui.d.ts regenerates.
// Prefer regenerating EUI types; this shim mirrors the node_modules eui.d.ts patch.
declare module '@elastic/eui/src/components/loading/loading_elastic_ring' {
  import type { FunctionComponent, HTMLAttributes } from 'react';

  export const SIZES: readonly ['m', 'l', 'xl'];
  export const MODES: readonly ['sweep', 'pulse'];
  export type EuiLoadingElasticRingSize = (typeof SIZES)[number];
  export type EuiLoadingElasticRingMode = (typeof MODES)[number];
  export interface EuiLoadingElasticRingProps {
    size?: EuiLoadingElasticRingSize;
    mode?: EuiLoadingElasticRingMode;
    loading?: boolean;
    label?: string;
  }
  export const EuiLoadingElasticRing: FunctionComponent<
    HTMLAttributes<HTMLDivElement> & EuiLoadingElasticRingProps
  >;
}

declare module '@elastic/eui/src/components/loading' {
  export type { EuiLoadingElasticRingProps } from '@elastic/eui/src/components/loading/loading_elastic_ring';
  export { EuiLoadingElasticRing } from '@elastic/eui/src/components/loading/loading_elastic_ring';
}
