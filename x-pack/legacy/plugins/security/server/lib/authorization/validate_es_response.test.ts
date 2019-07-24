/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateEsPrivilegeResponse } from './validate_es_response';

const resource1 = 'foo-resource';
const resource2 = 'bar-resource';
const application = 'foo-application';

const commonResponse = {
  username: 'user',
  has_all_requested: true,
};

describe('validateEsPrivilegeResponse', () => {
  it('should validate a proper response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: {
            action1: true,
            action2: true,
            action3: true,
          },
          [resource2]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    const result = validateEsPrivilegeResponse(
      response,
      application,
      ['action1', 'action2', 'action3'],
      [resource1, resource2]
    );
    expect(result).toEqual(response);
  });

  it('fails validation when an action is missing in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: {
            action1: true,
            action3: true,
          },
          [resource2]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an extra action is present in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: {
            action1: true,
            action2: true,
            action3: true,
            action4: true,
          },
          [resource2]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an action is malformed in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: {
            action1: true,
            action2: true,
            action3: 'not a boolean',
          },
          [resource2]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response as any,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an extra application is present in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: {
            action1: true,
            action2: true,
            action3: true,
          },
          [resource2]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
        otherApplication: {
          [resource1]: {
            action1: true,
            action2: true,
            action3: true,
          },
          [resource2]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when the requested application is missing from the response', () => {
    const response = {
      ...commonResponse,
      application: {},
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when the "application" property is missing from the response', () => {
    const response = {
      ...commonResponse,
      index: {},
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response as any,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an expected resource property is missing from the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when there are no resource properties in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {},
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when an unexpected resource property is present in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: {
            action1: true,
            action2: true,
            action3: true,
          },
          'other-resource': {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });

  it('fails validation when the resource propertry is malformed in the response', () => {
    const response = {
      ...commonResponse,
      application: {
        [application]: {
          [resource1]: 'not-an-object',
          [resource2]: {
            action1: true,
            action2: true,
            action3: true,
          },
        },
      },
    };

    expect(() =>
      validateEsPrivilegeResponse(
        response as any,
        application,
        ['action1', 'action2', 'action3'],
        [resource1, resource2]
      )
    ).toThrowErrorMatchingSnapshot();
  });
});
