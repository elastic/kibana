/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

export const description = t.string;
export const enabled = t.boolean;
export const exclude_export_details = t.boolean;
export const false_positives = t.array(t.string);
export const file_name = t.string;
