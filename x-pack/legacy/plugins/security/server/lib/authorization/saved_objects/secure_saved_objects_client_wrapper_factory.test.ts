/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesPlugin } from '../../../../../spaces/types';
import { createSecureSavedObjectsWrapperFactory } from './secure_saved_objects_client_wrapper_factory';
import { actionsFactory } from '../actions';
import { SavedObjectsClientContract } from 'src/core/server';
import { Legacy } from 'kibana';
import { createOptionalPlugin } from '../../../../../../server/lib/optional_plugin';

const config = {
  get: jest.fn().mockImplementation(key => {
    if (key === 'pkg.version') {
      return '7.0.0';
    }
    return '';
  }),
};

describe('createSecureSavedObjectsWrapperFactory', () => {
  it('creates the Saved Objects Client Wrapper factory', () => {
    const wrapperFactory = createSecureSavedObjectsWrapperFactory({
      spaces: createOptionalPlugin<SpacesPlugin>(config, 'xpack.spaces', {}, 'spaces'),
      authorization: {
        application: '.kibana-kibana',
        mode: {
          useRbacForRequest: () => true,
        },
        checkPrivilegesWithRequest: jest.fn(),
        checkPrivilegesDynamicallyWithRequest: jest
          .fn()
          .mockRejectedValue(new Error('should not be called')),
        actions: actionsFactory(config),
        privileges: null as any,
      },
      savedObjects: null as any,
      auditLogger: null as any,
    });

    expect(wrapperFactory).toBeInstanceOf(Function);
  });
});

describe('secureSavedObjectsClientWrapperFactory', () => {
  it(`constructs 'checkPrivileges' using the incoming request`, async () => {
    const authorization = {
      application: '.kibana-kibana',
      mode: {
        useRbacForRequest: () => true,
      },
      checkPrivilegesWithRequest: jest.fn(),
      checkPrivilegesDynamicallyWithRequest: jest
        .fn()
        .mockRejectedValue(new Error('should not be called')),
      actions: actionsFactory(config),
      privileges: null as any,
    };

    const wrapperFactory = createSecureSavedObjectsWrapperFactory({
      spaces: createOptionalPlugin<SpacesPlugin>(config, 'xpack.spaces', {}, 'spaces'),
      authorization,
      savedObjects: { SavedObjectsClient: { error: {} as any } } as any,
      auditLogger: null as any,
    });

    expect(authorization.checkPrivilegesWithRequest).not.toBeCalled();

    const client = (Symbol() as unknown) as SavedObjectsClientContract;
    const request = (Symbol() as unknown) as Legacy.Request;

    wrapperFactory({ client, request });

    expect(authorization.checkPrivilegesWithRequest).toBeCalledWith(request);
  });
});
