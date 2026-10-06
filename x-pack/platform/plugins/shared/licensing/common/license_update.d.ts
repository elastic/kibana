/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
export declare function createLicenseUpdate(
  triggerRefresh$: Observable<unknown>,
  stop$: Observable<unknown>,
  fetcher: () => Promise<ILicense>,
  initialValues?: ILicense
): {
  license$: Observable<ILicense>;
  refreshManually(): Promise<ILicense>;
};
