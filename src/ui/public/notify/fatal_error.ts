/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FatalErrorsStartContract } from '../../../core/public/fatal_errors';
import {
  AngularHttpError,
  formatAngularHttpError,
  isAngularHttpError,
} from './lib/format_angular_http_error';

let newPlatformFatalErrors: FatalErrorsStartContract;

export function __newPlatformInit__(instance: FatalErrorsStartContract) {
  if (newPlatformFatalErrors) {
    throw new Error('ui/notify/fatal_error already initialized with new platform apis');
  }

  newPlatformFatalErrors = instance;
}

export function addFatalErrorCallback(callback: () => void) {
  newPlatformFatalErrors.get$().subscribe(() => {
    callback();
  });
}

export function fatalError(error: AngularHttpError | Error | string, location?: string) {
  // add support for angular http errors to newPlatformFatalErrors
  if (isAngularHttpError(error)) {
    error = formatAngularHttpError(error);
  }

  newPlatformFatalErrors.add(error, location);
}
