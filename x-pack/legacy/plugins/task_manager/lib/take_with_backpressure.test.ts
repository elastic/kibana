/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fill } from 'lodash';
import { of, from, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { takeWithBackpressure, TAKE_RESULT } from './take_with_backpressure';

async function acceptAnyValue(_: any) {
  return true;
}
async function rejectAnyValue(_: any) {
  return false;
}
function acceptTheValue(expectedValue: any) {
  return async (value: any) => value === expectedValue;
}
async function acceptOddNumbers(value: number) {
  return value % 2 === 1;
}

describe('takeWithBackpressure', () => {
  describe('take operation', () => {
    test('it should act as an operation on an observable stream', done => {
      of(1)
        .pipe(takeWithBackpressure(acceptAnyValue, 1))
        .subscribe(([_, x]) => {
          expect(x).toEqual(1);
          done();
        });
    });

    test('it should return a result that indicates whether the value coule be `taken` from the stream', done => {
      of(1)
        .pipe(takeWithBackpressure(acceptTheValue(1), 1))
        .subscribe(([result, x]: [TAKE_RESULT, number]) => {
          expect(x).toEqual(1);
          expect(result).toEqual(TAKE_RESULT.TAKEN);
          done();
        });
    });

    test('it should return a result that indicates when a value coule not be `taken` from the stream', done => {
      of(1)
        .pipe(takeWithBackpressure(rejectAnyValue, 1))
        .subscribe(([result, x]: [TAKE_RESULT, number]) => {
          expect(x).toEqual(1);
          expect(result).toEqual(TAKE_RESULT.TAKE_REJECTED);
          done();
        });
    });

    test('it should return results for a stream of `taken` subjects', done => {
      of(1, 2, 3)
        .pipe(takeWithBackpressure(acceptTheValue(2), 3))
        .subscribe(
          ([result, x]: [TAKE_RESULT, number]) => {
            switch (x) {
              case 1:
                expect(result).toEqual(TAKE_RESULT.TAKE_REJECTED);
                break;
              case 2:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 3:
                expect(result).toEqual(TAKE_RESULT.TAKE_REJECTED);
                break;
            }
          },
          () => {},
          done
        );
    });
  });

  describe('maintaining backpressure', () => {
    test('it should take only as many subjects as it has capacity for', done => {
      of(1, 2, 3)
        .pipe(takeWithBackpressure(acceptAnyValue, 2))
        .subscribe(
          ([result, x]: [TAKE_RESULT, number]) => {
            switch (x) {
              case 1:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 2:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 3:
                expect(result).toEqual(TAKE_RESULT.RAN_OUT_OF_CAPACITY);
                break;
            }
          },
          () => {},
          done
        );
    });

    test('it should not count subjects which it has failed to take as part of its used capacity', done => {
      expect.assertions(3);
      of(1, 2, 3)
        .pipe(takeWithBackpressure(acceptOddNumbers, 2))
        .subscribe(
          ([result, x]: [TAKE_RESULT, number]) => {
            switch (x) {
              case 1:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 2:
                expect(result).toEqual(TAKE_RESULT.TAKE_REJECTED);
                break;
              case 3:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
            }
          },
          () => {},
          done
        );
    });

    test('it should keep consuming values until it reaches its target capacity of subjects to take', done => {
      const validSubject = () => ({ valid: true });
      const invalidSubject = () => ({ valid: false });
      const manyInvalidSubjets = Math.round(Math.random() * 100);

      const subjects = [
        validSubject(),
        ...fill(Array(manyInvalidSubjets), invalidSubject()), // randomly generate  1 - 100 invalid subjects
        validSubject(),
      ];

      const results: Array<[TAKE_RESULT, { valid: boolean }]> = [];
      from(subjects)
        .pipe(takeWithBackpressure(async (subject: { valid: boolean }) => subject.valid, 2))
        .subscribe(
          (result: [TAKE_RESULT, { valid: boolean }]) => {
            results.push(result);
          },
          () => {},
          () => {
            expect(results.shift()![0]).toEqual(TAKE_RESULT.TAKEN);
            expect(results.pop()![0]).toEqual(TAKE_RESULT.TAKEN);
            results.forEach(result => expect(results.pop()![0]).toEqual(TAKE_RESULT.TAKE_REJECTED));
            done();
          }
        );
    });

    test('it should complete the subscription once it has reached its capacity and drained its queue', done => {
      expect.assertions(5);
      of(1, 2, 3, 4, 5)
        .pipe(takeWithBackpressure(acceptOddNumbers, 2))
        .subscribe(
          ([result, subject]: [TAKE_RESULT, number]) => {
            switch (subject) {
              case 1:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 2:
                expect(result).toEqual(TAKE_RESULT.TAKE_REJECTED);
                break;
              case 3:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 4:
                expect(result).toEqual(TAKE_RESULT.RAN_OUT_OF_CAPACITY);
                break;
              case 5:
                expect(result).toEqual(TAKE_RESULT.RAN_OUT_OF_CAPACITY);
                break;
            }
          },
          () => {},
          done
        );
    });

    test(`it should not execute the takeValidator for any subjects it doesn't have capacity for`, done => {
      expect.assertions(3);
      const subjects = [
        {
          // this one is evaluated
          isValidated: true,
          isValid: true,
        },
        {
          // this one is evaluated and skipped
          isValidated: true,
          isValid: false,
        },
        {
          // this one is evaluated
          isValidated: true,
          isValid: true,
        },
        {
          // this one should not be evaluated as capacity is reached
          isValidated: false,
          isValid: true,
        },
        {
          // this one should not be evaluated as capacity is reached
          isValidated: false,
          isValid: true,
        },
      ];
      from(subjects)
        .pipe(
          takeWithBackpressure(async subject => {
            expect(subject.isValidated).toEqual(true);
            return subject.isValid;
          }, 2)
        )
        .subscribe(() => {}, () => {}, done);
    });
  });
  describe('failure', () => {
    test('it should short circuit once an error occurs in the takeValidator', done => {
      expect.assertions(6);
      of(
        { id: 1, throws: false },
        { id: 2, throws: false },
        { id: 3, throws: true },
        { id: 4, throws: false },
        { id: 5, throws: false },
        { id: 6, throws: false }
      )
        .pipe(
          takeWithBackpressure(async subject => {
            if (subject.throws) {
              throw new Error('invalid!');
            }
            return true;
          }, 3)
        )
        .subscribe(
          ([result, subject]: [TAKE_RESULT, { id: number; throws: boolean }]) => {
            switch (subject.id) {
              case 1:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 2:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 3:
                expect(result).toEqual(TAKE_RESULT.TAKE_FAILURE);
                break;
              case 4:
                expect(result).toEqual(TAKE_RESULT.TAKE_FAILURE);
                break;
              case 5:
                expect(result).toEqual(TAKE_RESULT.TAKE_FAILURE);
                break;
              case 6:
                expect(result).toEqual(TAKE_RESULT.TAKE_FAILURE);
                break;
            }
          },
          () => done(),
          () => {
            // observable should have ended with an error!
            done.fail();
          }
        );
    });

    test('it should short circuit once an error occurs in the source observable', done => {
      of(
        { id: 1, throws: false },
        { id: 2, throws: false },
        { id: 3, throws: true },
        { id: 4, throws: false },
        { id: 5, throws: false },
        { id: 6, throws: false }
      )
        .pipe(
          mergeMap(subject => (subject.throws ? throwError(new Error('invalid!')) : of(subject))),
          takeWithBackpressure(async subject => true, 3)
        )
        .subscribe(
          () => {
            // ideally we would drain the running queue, but as we're currently
            // dealing with an observable over a bounded synchronous array, we'll
            // defer dealign with this t oa later point
            done.fail();
          },
          () => done(),
          () => {
            // observable should have ended with an error!
            done.fail();
          }
        );
    });
  });
});
