/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { select } from '../../select';
import { Json, Selector, Vector2d, Vector3d, TransformMatrix2d, TransformMatrix3d } from '../..';
import {
  mvMultiply as mult2d,
  ORIGIN as UNIT2D,
  UNITMATRIX as UNITMATRIX2D,
  add as add2d,
} from '../../matrix2d';
import {
  mvMultiply as mult3d,
  ORIGIN as UNIT3D,
  NANMATRIX as NANMATRIX3D,
  add as add3d,
} from '../../matrix';

/*

  Type checking isn't too useful if future commits can accidentally weaken the type constraints, because a
  TypeScript linter will not complain - everything that passed before will continue to pass. The coder
  will not have feedback that the original intent with the typing got compromised. To declare the intent
  via passing and failing type checks, test cases are needed, some of which designed to expect a TS pass,
  some of them to expect a TS complaint. It documents intent for peers too, as type specs are a tough read.

  Run compile-time type specification tests in the `kibana` root with:

     yarn typespec

  Test "cases" expecting to pass TS checks are not annotated, while ones we want TS to complain about
  are prepended with the comment
 
  // typings:expect-error

  The test "suite" and "cases" are wrapped in IIFEs to prevent linters from complaining about the unused
  binding. It can be structured internally as desired.
  
*/

((): void => {
  /**
   * TYPE TEST SUITE
   */

  (function vectorArrayCreationTests(vec2d: Vector2d, vec3d: Vector3d): void {
    // 2D vector OK
    vec2d = [0, 0, 0] as Vector2d; // OK
    vec2d = [-0, NaN, -Infinity] as Vector2d; // IEEE 754 values are OK

    // 3D vector OK
    vec3d = [0, 0, 0, 0] as Vector3d;
    vec3d = [100, -0, Infinity, NaN] as Vector3d;

    // 2D vector not OK

    // typings:expect-error
    vec2d = 3; // not even an array
    // typings:expect-error
    vec2d = [] as Vector2d; // no elements
    // typings:expect-error
    vec2d = [0, 0] as Vector2d; // too few elements
    // typings:expect-error
    vec2d = [0, 0, 0, 0] as Vector2d; // too many elements

    // 3D vector not OK

    // typings:expect-error
    vec3d = 3; // not even an array
    // typings:expect-error
    vec3d = [] as Vector3d; // no elements
    // typings:expect-error
    vec3d = [0, 0, 0] as Vector3d; // too few elements
    // typings:expect-error
    vec3d = [0, 0, 0, 0, 0] as Vector3d; // too many elements

    return; // arrayCreationTests
  })(UNIT2D, UNIT3D);

  (function matrixArrayCreationTests(mat2d: TransformMatrix2d, mat3d: TransformMatrix3d): void {
    // 2D matrix OK
    mat2d = [0, 1, 2, 3, 4, 5, 6, 7, 8] as TransformMatrix2d; // OK
    mat2d = [-0, NaN, -Infinity, 3, 4, 5, 6, 7, 8] as TransformMatrix2d; // IEEE 754 values are OK

    // 3D matrix OK
    mat3d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as TransformMatrix3d;
    mat3d = [100, -0, Infinity, NaN, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as TransformMatrix3d;

    // 2D matrix not OK

    // typings:expect-error
    mat2d = 3; // not even an array
    // typings:expect-error
    mat2d = [] as TransformMatrix2d; // no elements
    // typings:expect-error
    mat2d = [0, 1, 2, 3, 4, 5, 6, 7] as TransformMatrix2d; // too few elements
    // typings:expect-error
    mat2d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as TransformMatrix2d; // too many elements

    // 3D vector not OK

    // typings:expect-error
    mat3d = 3; // not even an array
    // typings:expect-error
    mat3d = [] as TransformMatrix3d; // no elements
    // typings:expect-error
    mat3d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as TransformMatrix3d; // too few elements
    // typings:expect-error
    mat3d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as TransformMatrix3d; // too many elements

    // Matrix modification should NOT be OK
    mat3d[3] = 100; // too bad the ReadOnly part appears not to be enforced so can't precede it with typings:expect-error

    return; // arrayCreationTests
  })(UNITMATRIX2D, NANMATRIX3D);

  (function matrixMatrixAdditionTests(mat2d: TransformMatrix2d, mat3d: TransformMatrix3d): void {
    add2d(mat2d, mat2d); // OK
    add3d(mat3d, mat3d); // OK

    // typings:expect-error
    add2d(mat2d, mat3d); // at least one arg doesn't comply
    // typings:expect-error
    add2d(mat3d, mat2d); // at least one arg doesn't comply
    // typings:expect-error
    add2d(mat3d, mat3d); // at least one arg doesn't comply
    // typings:expect-error
    add3d(mat2d, mat3d); // at least one arg doesn't comply
    // typings:expect-error
    add3d(mat3d, mat2d); // at least one arg doesn't comply
    // typings:expect-error
    add3d(mat2d, mat2d); // at least one arg doesn't comply

    return; // matrixMatrixAdditionTests
  })(UNITMATRIX2D, NANMATRIX3D);

  (function matrixVectorMultiplicationTests(
    vec2d: Vector2d,
    mat2d: TransformMatrix2d,
    vec3d: Vector3d,
    mat3d: TransformMatrix3d
  ): void {
    mult2d(mat2d, vec2d); // OK
    mult3d(mat3d, vec3d); // OK

    // typings:expect-error
    mult3d(mat2d, vec2d); // trying to use a 3d fun for 2d args
    // typings:expect-error
    mult2d(mat3d, vec3d); // trying to use a 2d fun for 3d args

    // typings:expect-error
    mult2d(mat3d, vec2d); // 1st arg is a mismatch
    // typings:expect-error
    mult2d(mat2d, vec3d); // 2nd arg is a mismatch

    // typings:expect-error
    mult3d(mat2d, vec3d); // 1st arg is a mismatch
    // typings:expect-error
    mult3d(mat3d, vec2d); // 2nd arg is a mismatch

    return; // matrixVectorTests
  })(UNIT2D, UNITMATRIX2D, UNIT3D, NANMATRIX3D);

  (function jsonTests(plain: Json): void {
    // numbers are OK
    plain = 1;
    plain = NaN;
    plain = Infinity;
    plain = -Infinity;
    plain = Math.pow(2, 6);
    // other JSON primitive types are OK
    plain = false;
    plain = 'hello';
    plain = null;
    // structures made of above and of structures are OK
    plain = {};
    plain = [];
    plain = { a: 1 };
    plain = [0, null, false, NaN, 3.14, 'one more'];
    plain = { a: { b: 5, c: { d: [1, 'a', -Infinity, null], e: -1 }, f: 'b' }, g: false };

    // typings:expect-error
    plain = undefined; // it's undefined
    // typings:expect-error
    plain = a => a; // it's a function
    // typings:expect-error
    plain = [new Date()]; // it's a time
    // typings:expect-error
    plain = { a: Symbol('haha') }; // symbol isn't permitted either
    // typings:expect-error
    plain = window || void 0;
    // typings:expect-error
    plain = { a: { b: 5, c: { d: [1, 'a', undefined, null] } } }; // going deep into the structure

    return; // jsonTests
  })(null);

  (function selectTests(selector: Selector): void {
    selector = select((a: Json) => a); // one arg
    selector = select((a: Json, b: Json): Json => `${a} and ${b}`); // more args
    selector = select(() => 1); // zero arg
    selector = select((...args: Json[]) => args); // variadic

    // typings:expect-error
    selector = (a: Json) => a; // not a selector
    // typings:expect-error
    selector = select(() => {}); // should yield a JSON value, but it returns void
    // typings:expect-error
    selector = select((x: Json) => ({ a: x, b: undefined })); // should return a Json

    return; // selectTests
  })(select((a: Json) => a));

  return; // test suite
})();
