/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerPrivilegesWithCluster } from './register_privileges_with_cluster';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { buildRawKibanaPrivileges } from './privileges';
jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));
jest.mock('./privileges', () => ({
  buildRawKibanaPrivileges: jest.fn(),
}));

const application = 'default-application';

const registerPrivilegesWithClusterTest = (description, {
  settings = {},
  savedObjectTypes,
  privilegeMap,
  existingPrivileges,
  throwErrorWhenDeletingPrivileges,
  errorDeletingPrivilegeName,
  throwErrorWhenGettingPrivileges,
  throwErrorWhenPuttingPrivileges,
  assert
}) => {
  const registerMockCallWithInternalUser = () => {
    const callWithInternalUser = jest.fn();
    getClient.mockReturnValue({
      callWithInternalUser,
    });
    return callWithInternalUser;
  };

  const defaultVersion = 'default-version';

  const createMockServer = ({ privilegeMap }) => {
    const mockServer = {
      config: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
      log: jest.fn(),
      plugins: {
        security: {
          authorization: {
            actions: Symbol(),
            application,
            privileges: {
              get: () => privilegeMap
            }
          }
        }
      }
    };

    const defaultSettings = {
      'pkg.version': defaultVersion,
    };

    mockServer.config().get.mockImplementation(key => {
      return key in settings ? settings[key] : defaultSettings[key];
    });

    mockServer.savedObjects = {
      types: savedObjectTypes
    };

    return mockServer;
  };

  const createExpectUpdatedPrivileges = (mockServer, mockCallWithInternalUser, error) => {
    return (postPrivilegesBody, deletedPrivileges = []) => {
      expect(error).toBeUndefined();
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(2 + deletedPrivileges.length);
      expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.getPrivilege', {
        privilege: application,
      });
      expect(mockCallWithInternalUser).toHaveBeenCalledWith(
        'shield.postPrivileges',
        {
          body: postPrivilegesBody,
        }
      );
      for (const deletedPrivilege of deletedPrivileges) {
        expect(mockServer.log).toHaveBeenCalledWith(
          ['security', 'debug'],
          `Deleting Kibana Privilege ${deletedPrivilege} from Elasticearch for ${application}`
        );
        expect(mockCallWithInternalUser).toHaveBeenCalledWith(
          'shield.deletePrivilege',
          {
            application,
            privilege: deletedPrivilege
          }
        );
      }
      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Updated Kibana Privileges with Elasticearch for ${application}`
      );
    };
  };

  const createExpectDidntUpdatePrivileges = (mockServer, mockCallWithInternalUser, error) => {
    return () => {
      expect(error).toBeUndefined();
      expect(mockCallWithInternalUser).toHaveBeenCalledTimes(1);
      expect(mockCallWithInternalUser).toHaveBeenLastCalledWith('shield.getPrivilege', {
        privilege: application
      });

      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Registering Kibana Privileges with Elasticsearch for ${application}`
      );
      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'debug'],
        `Kibana Privileges already registered with Elasticearch for ${application}`
      );
    };
  };

  const createExpectErrorThrown = (mockServer, actualError) => {
    return (expectedErrorMessage) => {
      expect(actualError).toBeDefined();
      expect(actualError).toBeInstanceOf(Error);
      expect(actualError.message).toEqual(expectedErrorMessage);

      if (throwErrorWhenDeletingPrivileges) {
        expect(mockServer.log).toHaveBeenCalledWith(
          ['security', 'error'],
          `Error deleting Kibana Privilege ${errorDeletingPrivilegeName}`
        );
      }

      expect(mockServer.log).toHaveBeenCalledWith(
        ['security', 'error'],
        `Error registering Kibana Privileges with Elasticsearch for ${application}: ${expectedErrorMessage}`
      );
    };
  };

  test(description, async () => {
    const mockServer = createMockServer({
      privilegeMap
    });
    const mockCallWithInternalUser = registerMockCallWithInternalUser()
      .mockImplementation((api) => {
        switch(api) {
          case 'shield.getPrivilege': {
            if (throwErrorWhenGettingPrivileges) {
              throw throwErrorWhenGettingPrivileges;
            }

            // ES returns an empty object if we don't have any privileges
            if (!existingPrivileges) {
              return {};
            }

            return existingPrivileges;
          }
          case 'shield.deletePrivilege': {
            if (throwErrorWhenDeletingPrivileges) {
              throw throwErrorWhenDeletingPrivileges;
            }

            break;
          }
          case 'shield.postPrivileges': {
            if (throwErrorWhenPuttingPrivileges) {
              throw throwErrorWhenPuttingPrivileges;
            }

            return;
          }
          default: {
            expect(true).toBe(false);
          }
        }
      });

    let error;
    try {
      await registerPrivilegesWithCluster(mockServer);
    } catch (err) {
      error = err;
    }

    assert({
      expectUpdatedPrivileges: createExpectUpdatedPrivileges(mockServer, mockCallWithInternalUser, error),
      expectDidntUpdatePrivileges: createExpectDidntUpdatePrivileges(mockServer, mockCallWithInternalUser, error),
      expectErrorThrown: createExpectErrorThrown(mockServer, error),
      mocks: {
        buildRawKibanaPrivileges,
        server: mockServer,
      }
    });
  });
};

registerPrivilegesWithClusterTest(`inserts privileges when we don't have any existing privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:all']
    },
    space: {
      read: ['action:read']
    },
    features: {
      foo: {
        all: ['action:foo_all'],
      },
      bar: {
        read: ['action:bar_read'],
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
  },
  existingPrivileges: null,
  assert: ({ expectUpdatedPrivileges }) => {
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`deletes no-longer specified privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      read: ['action:bar']
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
      }
    }
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
        }
      }
    }, ['read', 'space_baz', 'reserved_customApplication']);
  }
});

registerPrivilegesWithClusterTest(`updates privileges when global actions don't match`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:baz']
      },
      bar: {
        read: ['action:quz']
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when space actions don't match`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:baz']
      },
      bar: {
        read: ['action:quz']
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when feature actions don't match`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:baz']
      },
      bar: {
        read: ['action:quz']
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when reserved actions don't match`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:baz']
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when global privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
      read: ['action:quz']
    },
    space: {
      read: ['action:bar']
    },
    features: {
      foo: {
        all: ['action:foo-all']
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when space privilege added`, {
  privilegeMap: {
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
      read: ['action:quz']
    },
    features: {
      foo: {
        all: ['action:foo-all']
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when feature privilege added`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
        read: ['action:foo-read']
      }
    },
    reserved: {
      customApplication: ['action:customApplication']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`updates privileges when reserved privilege added`, {
  privilegeMap: {
    features: {},
    global: {
      all: ['action:foo'],
    },
    space: {
      all: ['action:bar'],
    },
    features: {
      foo: {
        all: ['action:foo-all'],
      }
    },
    reserved: {
      customApplication1: ['action:customApplication1'],
      customApplication2: ['action:customApplication2']
    }
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
      }
    }
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
        }
      }
    });
  }
});

registerPrivilegesWithClusterTest(`doesn't update privileges when order of actions differ`, {
  privilegeMap: {
    global: {
      all: ['action:foo', 'action:quz']
    },
    space: {
      read: ['action:bar', 'action:quz']
    },
    features: {
      foo: {
        all: ['action:foo-all', 'action:bar-all']
      }
    },
    reserved: {
      customApplication: ['action:customApplication1', 'action:customApplication2']
    }
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
      }
    }
  },
  assert: ({ expectDidntUpdatePrivileges }) => {
    expectDidntUpdatePrivileges();
  }
});

registerPrivilegesWithClusterTest(`throws and logs error when errors getting privileges`, {
  privilegeMap: {
    features: {},
    global: {},
    space: {},
    reserved: {},
  },
  throwErrorWhenGettingPrivileges: new Error('Error getting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error getting privileges');
  }
});

registerPrivilegesWithClusterTest(`throws and logs error when errors putting privileges`, {
  privilegeMap: {
    features: {},
    global: {
      all: []
    },
    space: {
      read: []
    },
    reserved: {},
  },
  existingPrivileges: null,
  throwErrorWhenPuttingPrivileges: new Error('Error putting privileges'),
  assert: ({ expectErrorThrown }) => {
    expectErrorThrown('Error putting privileges');
  }
});
