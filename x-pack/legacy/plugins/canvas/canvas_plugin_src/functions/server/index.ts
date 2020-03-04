/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { demodata } from './demodata';
import { escount } from './escount';
import { esdocs } from './esdocs';
import { esbasic } from './esbasic';
import { pointseries } from './pointseries';
import { essql } from './essql';

export const functions = [demodata, esdocs, esbasic, escount, essql, pointseries];
