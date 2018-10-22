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

import { greatestCommonDivisor, leastCommonMultiple } from './math';

describe('math utils', () => {
  describe('greatestCommonDivisor', () => {
    const tests: Array<[number, number, number]> = [
      [3, 5, 1],
      [30, 36, 6],
      [5, 1, 1],
      [9, 9, 9],
      [40, 20, 20],
      [3, 0, 3],
      [0, 5, 5],
      [0, 0, 0],
      [-9, -3, 3],
      [-24, 8, 8],
      [22, -7, 1],
    ];

    tests.map(([a, b, expected]) => {
      it(`should return ${expected} for greatestCommonDivisor(${a}, ${b})`, () => {
        expect(greatestCommonDivisor(a, b)).toBe(expected);
      });
    });
  });

  describe('leastCommonMultiple', () => {
    const tests: Array<[number, number, number]> = [
      [3, 5, 15],
      [1, 1, 1],
      [5, 6, 30],
      [3, 9, 9],
      [8, 20, 40],
      [5, 5, 5],
      [0, 5, 0],
      [-4, -5, 20],
      [-2, -3, 6],
      [-8, 2, 8],
      [-8, 5, 40],
    ];

    tests.map(([a, b, expected]) => {
      it(`should return ${expected} for leastCommonMultiple(${a}, ${b})`, () => {
        expect(leastCommonMultiple(a, b)).toBe(expected);
      });
    });
  });
});
