/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { select } from '../../select';
import { Json, Selector } from '../..';

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
