/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import {
  DELETE_PRIVILEGES_BATCH_MAX_BYTES,
  registerPrivilegesWithCluster,
} from './register_privileges_with_cluster';
import type { RawKibanaPrivileges } from '../../common';
import type { SecurityTelemetryAttributes } from '../otel/instrumentation';
import { securityTelemetry } from '../otel/instrumentation';

// Mock the telemetry module
jest.mock('../otel/instrumentation', () => ({
  securityTelemetry: {
    recordPrivilegeRegistrationDuration: jest.fn(),
  },
}));

const application = 'default-application';
const registerPrivilegesWithClusterTest = (
  description: string,
  {
    privilegeMap,
    existingPrivileges,
    throwErrorWhenGettingPrivileges,
    throwErrorWhenDeletingPrivileges,
    alreadyDeletedPrivileges = [],
    throwErrorWhenPuttingPrivileges,
    assert,
  }: {
    privilegeMap: RawKibanaPrivileges;
    existingPrivileges?: Record<string, Record<string, any>> | null;
    throwErrorWhenGettingPrivileges?: Error;
    throwErrorWhenDeletingPrivileges?: Error;
    alreadyDeletedPrivileges?: string[];
    throwErrorWhenPuttingPrivileges?: Error;
    assert: (arg: {
      expectUpdatedPrivileges: (
        postPrivilegesBody: any,
        deletedPrivilegeBatches?: string[][]
      ) => void;
      expectDidntUpdatePrivileges: () => void;
      expectDeletedPrivilegesWithoutPut: (deletedPrivilegeBatches: string[][]) => void;
      expectErrorThrown: (expectedErrorMessage: string) => void;
      expectTelemetryRecorded: (attributes: SecurityTelemetryAttributes) => void;
    }) => void;
  }
) => {
  const expectDeletedPrivilegeBatches = (
    mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
    mockLogger: jest.Mocked<Logger>,
    deletedPrivilegeBatches: string[][]
  ) => {
    const { deletePrivileges } = mockClusterClient.asInternalUser.security;
    expect(deletePrivileges).toHaveBeenCalledTimes(deletedPrivilegeBatches.length);
    deletedPrivilegeBatches.forEach((batch, index) => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Deleting Kibana Privileges ${batch.join(', ')} from Elasticsearch for ${application}`
      );
      expect(deletePrivileges).toHaveBeenNthCalledWith(
        index + 1,
        { application, name: batch },
        { ignore: [404] }
      );
    });
  };

  const createExpectUpdatedPrivileges = (
    mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
    mockLogger: jest.Mocked<Logger>,
    error: Error
  ) => {
    return (postPrivilegesBody: any, deletedPrivilegeBatches: string[][] = []) => {
      expect(error).toBeUndefined();
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenCalledWith({
        application,
      });

      expect(mockClusterClient.asInternalUser.security.putPrivileges).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asInternalUser.security.putPrivileges).toHaveBeenCalledWith({
        body: postPrivilegesBody,
      });

      expectDeletedPrivilegeBatches(mockClusterClient, mockLogger, deletedPrivilegeBatches);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updated Kibana Privileges with Elasticsearch for ${application}`
      );
    };
  };

  const createExpectDidntUpdatePrivileges = (
    mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
    mockLogger: Logger,
    error: Error
  ) => {
    return () => {
      expect(error).toBeUndefined();
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asInternalUser.security.getPrivileges).toHaveBeenLastCalledWith({
        application,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Kibana Privileges already registered with Elasticsearch for ${application}`
      );
    };
  };

  const createExpectDeletedPrivilegesWithoutPut = (
    mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
    mockLogger: jest.Mocked<Logger>
  ) => {
    return (deletedPrivilegeBatches: string[][]) => {
      expectDeletedPrivilegeBatches(mockClusterClient, mockLogger, deletedPrivilegeBatches);
      expect(mockClusterClient.asInternalUser.security.putPrivileges).not.toHaveBeenCalled();
    };
  };

  const createExpectErrorThrown = (mockLogger: Logger, actualError: Error) => {
    return (expectedErrorMessage: string) => {
      expect(actualError).toBeDefined();
      expect(actualError).toBeInstanceOf(Error);
      expect(actualError.message).toEqual(expectedErrorMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error registering Kibana Privileges with Elasticsearch for ${application}: ${expectedErrorMessage}`
      );
    };
  };

  const createExpectTelemetryRecorded = () => {
    return (attributes: SecurityTelemetryAttributes) => {
      expect(securityTelemetry.recordPrivilegeRegistrationDuration).toHaveBeenCalled();
      expect(securityTelemetry.recordPrivilegeRegistrationDuration).toHaveBeenLastCalledWith(
        expect.any(Number),
        attributes
      );
    };
  };

  test(description, async () => {
    const mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockClusterClient.asInternalUser.security.getPrivileges.mockImplementation((async () => {
      if (throwErrorWhenGettingPrivileges) {
        throw throwErrorWhenGettingPrivileges;
      }

      // ES returns an empty object if we don't have any privileges
      if (!existingPrivileges) {
        return {};
      }

      return existingPrivileges;
    }) as any);
    mockClusterClient.asInternalUser.security.deletePrivileges.mockImplementation((async ({
      name,
    }: {
      name: string[];
    }) => {
      if (throwErrorWhenDeletingPrivileges) {
        throw throwErrorWhenDeletingPrivileges;
      }

      return {
        [application]: Object.fromEntries(
          name.map((privilegeName) => [
            privilegeName,
            { found: !alreadyDeletedPrivileges.includes(privilegeName) },
          ])
        ),
      };
    }) as any);
    mockClusterClient.asInternalUser.security.putPrivileges.mockImplementation((async () => {
      if (throwErrorWhenPuttingPrivileges) {
        throw throwErrorWhenPuttingPrivileges;
      }
    }) as any);

    const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

    let error;
    try {
      await registerPrivilegesWithCluster(
        mockLogger,
        { get: jest.fn().mockReturnValue(privilegeMap) },
        application,
        mockClusterClient
      );
    } catch (err) {
      error = err;
    }

    assert({
      expectUpdatedPrivileges: createExpectUpdatedPrivileges(mockClusterClient, mockLogger, error),
      expectDidntUpdatePrivileges: createExpectDidntUpdatePrivileges(
        mockClusterClient,
        mockLogger,
        error
      ),
      expectDeletedPrivilegesWithoutPut: createExpectDeletedPrivilegesWithoutPut(
        mockClusterClient,
        mockLogger
      ),
      expectErrorThrown: createExpectErrorThrown(mockLogger, error),
      expectTelemetryRecorded: createExpectTelemetryRecorded(),
    });
  });
};

registerPrivilegesWithClusterTest(`inserts privileges when we don't have any existing privileges`, {
  privilegeMap: {
    global: {
      all: ['action:all'],
    },
    space: {
      read: ['action:read'],
    },
    features: {
      foo: {
        all: ['action:foo_all'],
      },
      bar: {
        read: ['action:bar_read'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: null,
  assert: ({ expectUpdatedPrivileges, expectTelemetryRecorded }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:all'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:read'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo_all'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:bar_read'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });

    expectTelemetryRecorded({
      application,
      outcome: 'success',
      deletedPrivileges: 0,
    });
  },
});

registerPrivilegesWithClusterTest(`deletes no-longer specified privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    reserved: {},
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:not-foo'],
        metadata: {},
      },
      read: {
        application,
        name: 'read',
        actions: ['action:not-quz'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:not-bar'],
        metadata: {},
      },
      space_baz: {
        application,
        name: 'space_baz',
        actions: ['action:not-baz'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges, expectTelemetryRecorded }) => {
    expectUpdatedPrivileges(
      {
        [application]: {
          all: {
            application,
            name: 'all',
            actions: ['action:foo'],
            metadata: {},
          },
          space_read: {
            application,
            name: 'space_read',
            actions: ['action:bar'],
            metadata: {},
          },
        },
      },
      [['read', 'space_baz', 'reserved_customApplication']]
    );

    expectTelemetryRecorded({
      application,
      outcome: 'success',
      deletedPrivileges: 3,
    });
  },
});

// Builds a privilege name whose URL-encoded form is exactly `length` bytes long.
const privilegeNameOfLength = (prefix: string, length: number) =>
  `${prefix}${'x'.repeat(length - prefix.length)}`;

const toExistingPrivileges = (names: string[]) => ({
  [application]: Object.fromEntries(
    names.map((name) => [name, { application, name, actions: ['action:old'], metadata: {} }])
  ),
});

const globalAllOnly = {
  privilegeMap: { features: {}, global: { all: ['action:all'] }, space: {}, reserved: {} },
  expectedPutBody: {
    [application]: { all: { application, name: 'all', actions: ['action:all'], metadata: {} } },
  },
};

{
  // 19 names of 100 bytes plus 18 `%2C` separators come to 1954 bytes. A 20th name would make 2057.
  const orphanedNames = Array.from({ length: 45 }, (_, index) =>
    privilegeNameOfLength(`feature_orphan${index}.`, 100)
  );

  registerPrivilegesWithClusterTest(`deletes orphaned privileges in batches that fit the budget`, {
    privilegeMap: globalAllOnly.privilegeMap,
    existingPrivileges: toExistingPrivileges(['all', ...orphanedNames]),
    assert: ({ expectUpdatedPrivileges, expectTelemetryRecorded }) => {
      expect(DELETE_PRIVILEGES_BATCH_MAX_BYTES).toBe(2048);
      expectUpdatedPrivileges(globalAllOnly.expectedPutBody, [
        orphanedNames.slice(0, 19),
        orphanedNames.slice(19, 38),
        orphanedNames.slice(38),
      ]);

      expectTelemetryRecorded({
        application,
        outcome: 'success',
        deletedPrivileges: 45,
      });
    },
  });
}

{
  // 1022 + 3 + 1023 is exactly the 2048 byte budget, so the first two names share a batch.
  const exactFit = [
    privilegeNameOfLength('feature_a.', 1022),
    privilegeNameOfLength('feature_b.', 1023),
  ];
  const nextName = 'feature_c.all';

  registerPrivilegesWithClusterTest(`fills a delete batch up to exactly the budget`, {
    privilegeMap: globalAllOnly.privilegeMap,
    existingPrivileges: toExistingPrivileges(['all', ...exactFit, nextName]),
    assert: ({ expectUpdatedPrivileges }) => {
      expectUpdatedPrivileges(globalAllOnly.expectedPutBody, [exactFit, [nextName]]);
    },
  });
}

{
  const oversizedName = privilegeNameOfLength('feature_oversized.', 3000);

  registerPrivilegesWithClusterTest(`deletes a privilege name larger than the budget on its own`, {
    privilegeMap: globalAllOnly.privilegeMap,
    existingPrivileges: toExistingPrivileges([
      'all',
      'feature_a.all',
      oversizedName,
      'feature_b.all',
    ]),
    assert: ({ expectUpdatedPrivileges }) => {
      expectUpdatedPrivileges(globalAllOnly.expectedPutBody, [
        ['feature_a.all'],
        [oversizedName],
        ['feature_b.all'],
      ]);
    },
  });
}

registerPrivilegesWithClusterTest(`only counts privileges that Elasticsearch actually deleted`, {
  privilegeMap: globalAllOnly.privilegeMap,
  existingPrivileges: toExistingPrivileges([
    'all',
    'feature_a.all',
    'feature_a.read',
    'feature_b.all',
  ]),
  alreadyDeletedPrivileges: ['feature_a.read', 'feature_b.all'],
  assert: ({ expectUpdatedPrivileges, expectTelemetryRecorded }) => {
    expectUpdatedPrivileges(globalAllOnly.expectedPutBody, [
      ['feature_a.all', 'feature_a.read', 'feature_b.all'],
    ]);

    expectTelemetryRecorded({
      application,
      outcome: 'success',
      deletedPrivileges: 1,
    });
  },
});

registerPrivilegesWithClusterTest(`doesn't put privileges when deleting privileges fails`, {
  privilegeMap: globalAllOnly.privilegeMap,
  existingPrivileges: toExistingPrivileges(['all', 'feature_a.all', 'feature_a.read']),
  throwErrorWhenDeletingPrivileges: new Error('Error deleting privileges'),
  assert: ({ expectDeletedPrivilegesWithoutPut, expectErrorThrown, expectTelemetryRecorded }) => {
    expectDeletedPrivilegesWithoutPut([['feature_a.all', 'feature_a.read']]);
    expectErrorThrown('Error deleting privileges');

    expectTelemetryRecorded({
      application,
      outcome: 'failure',
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when global actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
      bar: {
        read: ['action:quz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      'feature_bar.read': {
        application,
        name: 'feature_bar.read',
        actions: ['action:not-quz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges, expectTelemetryRecorded }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:quz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });

    expectTelemetryRecorded({
      application,
      outcome: 'success',
      deletedPrivileges: 0,
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when space actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
      bar: {
        read: ['action:quz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:not-bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      'feature_bar.read': {
        application,
        name: 'feature_bar.read',
        actions: ['action:quz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges, expectTelemetryRecorded }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:quz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });

    expectTelemetryRecorded({
      application,
      outcome: 'success',
      deletedPrivileges: 0,
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when feature actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
      bar: {
        read: ['action:quz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      'feature_bar.read': {
        application,
        name: 'feature_bar.read',
        actions: ['action:not-quz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        'feature_bar.read': {
          application,
          name: 'feature_bar.read',
          actions: ['action:quz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when reserved actions don't match`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:baz'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:baz'],
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:not-customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:baz'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when global privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
      read: ['action:quz'],
    },
    space: {
      read: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        read: {
          application,
          name: 'read',
          actions: ['action:quz'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:bar'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when space privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
      read: ['action:quz'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:not-bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_all: {
          application,
          name: 'space_all',
          actions: ['action:bar'],
          metadata: {},
        },
        space_read: {
          application,
          name: 'space_read',
          actions: ['action:quz'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when feature privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
        read: ['action:foo-read'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_all: {
        application,
        name: 'space_all',
        actions: ['action:not-bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_all: {
          application,
          name: 'space_all',
          actions: ['action:bar'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        'feature_foo.read': {
          application,
          name: 'feature_foo.read',
          actions: ['action:foo-read'],
          metadata: {},
        },
        reserved_customApplication: {
          application,
          name: 'reserved_customApplication',
          actions: ['action:customApplication'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`updates privileges when reserved privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
      },
    },
    reserved: {
      customApplication1: ['action:customApplication1'],
      customApplication2: ['action:customApplication2'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'foo',
        actions: ['action:not-foo'],
        metadata: {},
      },
      space_all: {
        application,
        name: 'space_all',
        actions: ['action:not-bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:foo-all'],
        metadata: {},
      },
      reserved_customApplication1: {
        application,
        name: 'reserved_customApplication1',
        actions: ['action:customApplication1'],
        metadata: {},
      },
    },
  },
  assert: ({ expectUpdatedPrivileges }) => {
    expectUpdatedPrivileges({
      [application]: {
        all: {
          application,
          name: 'all',
          actions: ['action:foo'],
          metadata: {},
        },
        space_all: {
          application,
          name: 'space_all',
          actions: ['action:bar'],
          metadata: {},
        },
        'feature_foo.all': {
          application,
          name: 'feature_foo.all',
          actions: ['action:foo-all'],
          metadata: {},
        },
        reserved_customApplication1: {
          application,
          name: 'reserved_customApplication1',
          actions: ['action:customApplication1'],
          metadata: {},
        },
        reserved_customApplication2: {
          application,
          name: 'reserved_customApplication2',
          actions: ['action:customApplication2'],
          metadata: {},
        },
      },
    });
  },
});

registerPrivilegesWithClusterTest(`doesn't update privileges when order of actions differ`, {
  privilegeMap: {
    global: {
      all: ['action:foo', 'action:quz'],
    },
    space: {
      read: ['action:bar', 'action:quz'],
    },
    features: {
      foo: {
        all: ['action:foo-all', 'action:bar-all'],
      },
    },
    reserved: {
      customApplication: ['action:customApplication1', 'action:customApplication2'],
    },
  },
  existingPrivileges: {
    [application]: {
      all: {
        application,
        name: 'all',
        actions: ['action:quz', 'action:foo'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action:quz', 'action:bar'],
        metadata: {},
      },
      'feature_foo.all': {
        application,
        name: 'feature_foo.all',
        actions: ['action:bar-all', 'action:foo-all'],
        metadata: {},
      },
      reserved_customApplication: {
        application,
        name: 'reserved_customApplication',
        actions: ['action:customApplication2', 'action:customApplication1'],
        metadata: {},
      },
    },
  },
  assert: ({ expectDidntUpdatePrivileges }) => {
    expectDidntUpdatePrivileges();
  },
});

registerPrivilegesWithClusterTest(`throws and logs error when errors getting privileges`, {
  privilegeMap: {
    features: {},
    global: {},
    space: {},
    reserved: {},
  },
  throwErrorWhenGettingPrivileges: new Error('Error getting privileges'),
  assert: ({ expectErrorThrown, expectTelemetryRecorded }) => {
    expectErrorThrown('Error getting privileges');

    expectTelemetryRecorded({
      application,
      outcome: 'failure',
    });
  },
});

registerPrivilegesWithClusterTest(`throws and logs error when errors putting privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: [],
    },
    space: {
      read: [],
    },
    reserved: {},
  },
  existingPrivileges: null,
  throwErrorWhenPuttingPrivileges: new Error('Error putting privileges'),
  assert: ({ expectErrorThrown, expectTelemetryRecorded }) => {
    expectErrorThrown('Error putting privileges');

    expectTelemetryRecorded({
      application,
      outcome: 'failure',
    });
  },
});
