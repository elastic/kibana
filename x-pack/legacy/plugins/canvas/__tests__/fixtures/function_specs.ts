/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Untyped Library
import { Fn } from '@kbn/interpreter/common';
import { functions as browserFns } from '../../canvas_plugin_src/functions/browser';
import { functions as commonFns } from '../../canvas_plugin_src/functions/common';
import { functions as serverFns } from '../../canvas_plugin_src/functions/server';

export const functionSpecs = [...browserFns, ...commonFns, ...serverFns].map(fn => new Fn(fn()));
