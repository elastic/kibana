/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';
import { BehaviorSubject } from 'rxjs';

export const SHOW_CHARTS_DEFAULT: boolean;

export const showCharts$: BehaviorSubject<boolean>;

export const CheckboxShowCharts: FC<{ showCharts: boolean }>;
