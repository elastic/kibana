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

declare module '*.html' {
  const template: string;
  // eslint-disable-next-line import/no-default-export
  export default template;
}

declare module '*.png' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

declare module '*.svg' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

// allow JSON files to be imported directly without lint errors
// see: https://github.com/palantir/tslint/issues/1264#issuecomment-228433367
// and: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#arbitrary-expressions-are-forbidden-in-export-assignments-in-ambient-contexts
declare module '*.json' {
  const json: any;
  // eslint-disable-next-line import/no-default-export
  export default json;
}

type MethodKeysOf<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type PublicMethodsOf<T> = Pick<T, MethodKeysOf<T>>;

type MockedKeys<T> = { [P in keyof T]: jest.Mocked<T[P]> };

type DeeplyMockedKeys<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? jest.MockInstance<ReturnType<T[P]>, Parameters<T[P]>>
    : DeeplyMockedKeys<T[P]>;
} &
  T;

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};
