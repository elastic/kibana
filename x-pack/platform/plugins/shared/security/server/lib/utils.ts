/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function   escapeString(val: string): string {
  return `"${val.replace(/["]/g, '\\"')}"`;
}

export function   replaceAll(str: string, search: string, replace: string): string {
  return str.replaceAll(`/`, `\/`).replaceAll(`.`, `\.`);
}
