/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';

export function getIndexPatternService(): {
  get: (id: string) => IIndexPattern | undefined;
};

export function setLicenseId(args: unknown): void;
export function setInspector(args: unknown): void;
export function setFileUpload(args: unknown): void;
export function setIndexPatternSelect(args: unknown): void;
export function setHttp(args: unknown): void;
export function setTimeFilter(args: unknown): void;
export function setUiSettings(args: unknown): void;
export function setInjectedVarFunc(args: unknown): void;
export function setToasts(args: unknown): void;
export function setIndexPatternService(args: unknown): void;
export function setAutocompleteService(args: unknown): void;
