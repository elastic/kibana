/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MustacheInEmailRegExp = /\{\{((.|\n)*)\}\}/;

/** does the string contain `{{.*}}`? */
export function hasMustacheTemplate(string: string): boolean {
  return !!string.match(MustacheInEmailRegExp);
}

/** filter strings that do not contain `{{.*}}` */
export function withoutMustacheTemplate(strings: string[]): string[] {
  return strings.filter((string) => !hasMustacheTemplate(string));
}
