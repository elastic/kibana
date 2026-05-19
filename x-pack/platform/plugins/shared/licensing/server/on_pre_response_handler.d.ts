/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnPreResponseHandler } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { Observable } from 'rxjs';
export declare function createOnPreResponseHandler(
  refresh: () => Promise<ILicense>,
  license$: Observable<ILicense>
): OnPreResponseHandler;
