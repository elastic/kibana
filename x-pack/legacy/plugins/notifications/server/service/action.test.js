/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from './action';
import { ActionResult } from './action_result';

describe('Action', () => {

  const server = { };
  const id = 'notifications-test';
  const unimplementedName = 'Unimplemented';
  const throwsErrorName = 'Throws Error';
  const passThruName = 'Test Action';
  const action = new Action({ server, id, name: unimplementedName  });
  const notification = {
    fake: true,
  };

  test('id and name to be from constructor', () => {
    expect(action.server).toBe(server);
    expect(action.getId()).toBe(id);
    expect(action.getName()).toBe(unimplementedName);
  });

  test('getMissingFields returns an empty array', () => {
    expect(action.getMissingFields()).toEqual([]);
    expect(action.getMissingFields(notification)).toEqual([]);
  });

  test('doPerformHealthChecks throws error indicating that it is not implemented', async () => {
    await expect(action.doPerformHealthCheck())
      .rejects
      .toThrow(`[doPerformHealthCheck] is not implemented for '${unimplementedName}' action.`);
  });

  describe('performHealthChecks', () => {

    class ThrowsErrorHealthCheckAction extends Action {
      constructor() {
        super({ server: { }, id, name: throwsErrorName });
      }

      async doPerformHealthCheck() {
        throw new Error('TEST - expected');
      }
    }

    class PassThruHealthCheckAction extends Action {
      constructor(result) {
        super({ server: { }, id, name: passThruName });
        this.result = result;
      }

      async doPerformHealthCheck() {
        return this.result;
      }
    }

    test('runs against unimplemented doPerformHealthChecks', async () => {
      const result = await action.performHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage())
        .toMatch(new RegExp(`^Unable to perform '${unimplementedName}' health check: \\[doPerformHealthCheck\\] is not.*`));
    });

    test('runs against failing doPerformHealthChecks', async () => {
      const failAction = new ThrowsErrorHealthCheckAction();
      const result = await failAction.performHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage())
        .toMatch(new RegExp(`^Unable to perform '${throwsErrorName}' health check: TEST - expected`));
    });

    test('runs against succeeding result', async () => {
      const expectedResult = new ActionResult({ message: 'Blah', response: { ok: true } });
      const succeedsAction = new PassThruHealthCheckAction(expectedResult);
      const result = await succeedsAction.performHealthCheck();

      expect(result).toBe(expectedResult);
    });

  });

  test('doPerformAction throws error indicating that it is not implemented', async () => {
    await expect(action.doPerformAction(notification))
      .rejects
      .toThrow(`[doPerformAction] is not implemented for '${unimplementedName}' action: {"fake":true}`);
  });

  describe('isLicenseValid', () => {

    test('server variable is not exposed as expected', () => {
      expect(() => action.isLicenseValid()).toThrow(Error);
    });

    test('returns false is license is not valid', () => {
      const unlicensedServer = {
        plugins: {
          xpack_main: {
            info: {
              license: {
                isNotBasic: () => false
              }
            }
          }
        }
      };
      const unlicensedAction = new Action({ server: unlicensedServer, id, name: unimplementedName  });

      expect(unlicensedAction.isLicenseValid()).toBe(false);
    });

    test('returns true is license is not valid', () => {
      const licensedServer = {
        plugins: {
          xpack_main: {
            info: {
              license: {
                isNotBasic: () => true
              }
            }
          }
        }
      };
      const licensedAction = new Action({ server: licensedServer, id, name: unimplementedName  });

      expect(licensedAction.isLicenseValid()).toBe(true);
    });

  });

  describe('performAction', () => {

    // valid license
    const server = {
      plugins: {
        xpack_main: {
          info: {
            license: {
              isNotBasic: () => true
            }
          }
        }
      }
    };

    class ThrowsErrorAction extends Action {
      constructor() {
        super({ server, id, name: throwsErrorName });
      }

      async doPerformAction() {
        throw new Error('TEST - expected');
      }
    }

    class PassThruAction extends Action {
      constructor(result) {
        super({ server, id, name: passThruName });
        this.result = result;
      }

      async doPerformAction() {
        return this.result;
      }
    }

    describe('fails license check', () => {

      // handles the case when xpack_main definitions change
      test('because of bad reference', async () => {
        // server is an empty object, so a reference fails early in the chain (mostly a way to give devs a way to find this error)
        const result = await action.performAction(notification);

        expect(result instanceof ActionResult).toBe(true);
        expect(result.isOk()).toBe(false);
      });

      test('because license is invalid or basic', async () => {
        const unlicensedServer = {
          plugins: {
            xpack_main: {
              info: {
                license: {
                  isNotBasic: () => false
                }
              }
            }
          }
        };
        const unlicensedAction = new Action({ server: unlicensedServer, id, name: unimplementedName  });
        const result = await unlicensedAction.performAction(notification);

        expect(result instanceof ActionResult).toBe(true);
        expect(result.isOk()).toBe(false);
        expect(result.getMessage())
          .toMatch(
            `Unable to perform '${unimplementedName}' action: ` +
            `The current license does not allow '${unimplementedName}' action.`
          );
      });

    });

    test('runs against unimplemented doPerformAction', async () => {
      const licensedAction = new Action({ server, id, name: unimplementedName  });
      const result = await licensedAction.performAction(notification);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage())
        .toMatch(new RegExp(`^Unable to perform '${unimplementedName}' action: \\[doPerformAction\\] is not.*`));
    });

    test('runs against failing doPerformAction', async () => {
      const failAction = new ThrowsErrorAction();
      const result = await failAction.performAction(notification);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.getMessage())
        .toMatch(new RegExp(`^Unable to perform '${throwsErrorName}' action: TEST - expected`));
    });

    test('runs against succeeding result', async () => {
      const expectedResult = new ActionResult({ message: 'Blah', response: { ok: true } });
      const succeedsAction = new PassThruAction(expectedResult);
      const result = await succeedsAction.performAction(notification);

      expect(result).toBe(expectedResult);
    });

  });

});
