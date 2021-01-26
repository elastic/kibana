/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

declare module '*.html' {
  const template: string;
  // eslint-disable-next-line import/no-default-export
  export default template;
}

declare abstract class Foo {
  bar(): string;
}

declare class Bar implements Foo {}

type MethodKeysOf<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type PublicMethodsOf<T> = Pick<T, MethodKeysOf<T>>;
