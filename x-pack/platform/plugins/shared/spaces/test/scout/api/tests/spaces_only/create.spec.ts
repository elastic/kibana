/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, expect, tags } from '@kbn/scout';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

// Space IDs
const DEFAULT_SPACE_ID = 'default';
const SPACE_1_ID = 'space_1';
const SPACE_2_ID = 'space_2';
const ALL_SPACES_ID = '*';
const EACH_SPACE = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];

// Test attribute
const NEW_ATTRIBUTE_KEY = 'title';
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;

// Test cases - single namespace objects
const SINGLE_NAMESPACE_DEFAULT_SPACE = {
  type: 'isolatedtype',
  id: 'defaultspace-isolatedtype-id',
  expectedNamespaces: [DEFAULT_SPACE_ID],
};

const SINGLE_NAMESPACE_SPACE_1 = {
  type: 'isolatedtype',
  id: 'space1-isolatedtype-id',
  expectedNamespaces: [SPACE_1_ID],
};

const SINGLE_NAMESPACE_SPACE_2 = {
  type: 'isolatedtype',
  id: 'space2-isolatedtype-id',
  expectedNamespaces: [SPACE_2_ID],
};

// Test cases - multi-namespace objects
const MULTI_NAMESPACE_ALL_SPACES = {
  type: 'sharedtype',
  id: 'all_spaces',
  expectedNamespaces: [ALL_SPACES_ID],
};

const MULTI_NAMESPACE_DEFAULT_AND_SPACE_1 = {
  type: 'sharedtype',
  id: 'default_and_space_1',
  expectedNamespaces: [DEFAULT_SPACE_ID, SPACE_1_ID],
};

const MULTI_NAMESPACE_ONLY_SPACE_1 = {
  type: 'sharedtype',
  id: 'only_space_1',
  expectedNamespaces: [SPACE_1_ID],
};

const MULTI_NAMESPACE_ONLY_SPACE_2 = {
  type: 'sharedtype',
  id: 'only_space_2',
  expectedNamespaces: [SPACE_2_ID],
};

const MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE = {
  type: 'sharecapabletype',
  id: 'only_default_space',
  expectedNamespaces: [DEFAULT_SPACE_ID],
};

const MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1 = {
  type: 'sharecapabletype',
  id: 'only_space_1',
  expectedNamespaces: [SPACE_1_ID],
};

// Test cases - namespace agnostic
const NAMESPACE_AGNOSTIC = {
  type: 'globaltype',
  id: 'globaltype-id',
};

// Test cases - hidden type
const HIDDEN = {
  type: 'hiddentype',
  id: 'any',
};

// Test cases - new objects
const NEW_SINGLE_NAMESPACE_OBJ = {
  type: 'dashboard',
  id: '', // ID intentionally left blank
};

const NEW_MULTI_NAMESPACE_OBJ = {
  type: 'sharedtype',
  id: 'new-sharedtype-id',
};

const NEW_NAMESPACE_AGNOSTIC_OBJ = {
  type: 'globaltype',
  id: 'new-globaltype-id',
};

// Test cases - initial namespaces
const INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE = {
  type: 'isolatedtype',
  id: 'new-other-space-id',
  expectedNamespaces: ['other-space'],
  initialNamespaces: ['other-space'],
};

const INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE = {
  type: 'sharecapabletype',
  id: 'new-other-space-id',
  expectedNamespaces: ['other-space'],
  initialNamespaces: ['other-space'],
};

const INITIAL_NS_MULTI_NAMESPACE_OBJ_EACH_SPACE = {
  type: 'sharedtype',
  id: 'new-each-space-id',
  expectedNamespaces: EACH_SPACE,
  initialNamespaces: EACH_SPACE,
};

const INITIAL_NS_MULTI_NAMESPACE_OBJ_ALL_SPACES = {
  type: 'sharedtype',
  id: 'new-all-spaces-id',
  expectedNamespaces: [ALL_SPACES_ID],
  initialNamespaces: [ALL_SPACES_ID],
};

// Test cases - alias conflict
const ALIAS_CONFLICT_OBJ = {
  type: 'resolvetype',
  id: 'alias-match',
};

apiTest.describe('_create', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(
      'x-pack/platform/test/saved_object_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
    );
  });

  apiTest.only(
    'default: should return 409 when trying to create dashboard that already exists',
    async ({ apiClient, requestAuth }) => {
      // const adminCredentials = await requestAuth.getApiKey('adjddddmin');
      /*
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = SINGLE_NAMESPACE_DEFAULT_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
      expect(body.error).toBe('Conflict');
      expect(body.message).toContain(`Saved object [${type}/${id}] conflict`);

      */
    }
  );

  /*
  apiTest(
    'default: should return 200 when trying to create dashboard from another space',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = SINGLE_NAMESPACE_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.type).toBe(type);
      expect(body.id).toBe(id);
      expect(body.attributes[NEW_ATTRIBUTE_KEY]).toBe(NEW_ATTRIBUTE_VAL);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default: should return 200 when creating object in space_2 from default space',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = SINGLE_NAMESPACE_SPACE_2;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default: should return 409 when creating multi-namespace object in all spaces',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = MULTI_NAMESPACE_ALL_SPACES;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'default: should return 409 when creating multi-namespace object in default and space_1',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = MULTI_NAMESPACE_DEFAULT_AND_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'default: should return 200 when creating multi-namespace object only in space_1',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = MULTI_NAMESPACE_ONLY_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default: should return 200 when creating multi-namespace object only in space_2',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = MULTI_NAMESPACE_ONLY_SPACE_2;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default: should return 409 when creating isolated multi-namespace object in default space',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'default: should return 200 when creating isolated multi-namespace object in space_1',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default: should return 409 when creating namespace-agnostic object',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = NAMESPACE_AGNOSTIC;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest('default: should return 400 when creating hidden type object', async ({ apiClient }) => {
    const spaceId = DEFAULT_SPACE_ID;
    const { type, id } = HIDDEN;
    const path = `${type}/${id}`;
    const requestBody = {
      attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
    };

    const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
      headers: COMMON_HEADERS,
      body: requestBody,
      responseType: 'json',
    });

    expect(statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
  });

  apiTest(
    'default: should return 200 when creating new single namespace object',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type } = NEW_SINGLE_NAMESPACE_OBJ;
      const path = type; // no ID
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.type).toBe(type);
      expect(body.id).toBeDefined();
      expect(body.attributes[NEW_ATTRIBUTE_KEY]).toBe(NEW_ATTRIBUTE_VAL);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default: should return 200 when creating new multi-namespace object',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = NEW_MULTI_NAMESPACE_OBJ;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.type).toBe(type);
      expect(body.id).toBe(id);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default: should return 200 when creating new namespace-agnostic object',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = NEW_NAMESPACE_AGNOSTIC_OBJ;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.type).toBe(type);
      expect(body.id).toBe(id);
      expect(body.namespaces).toBeUndefined(); // namespace-agnostic objects don't have namespaces
    }
  );

  apiTest(
    'default: should return 400 when creating object with initialNamespaces in multiple spaces (single namespace type)',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
        initialNamespaces: ['x', 'y'],
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
    }
  );

  apiTest(
    'default: should return 200 when creating object with initialNamespaces in single other space',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id, initialNamespaces, expectedNamespaces } =
        INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
        initialNamespaces,
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual(expectedNamespaces);
    }
  );

  apiTest(
    'default: should return 400 when creating isolated multi-namespace object with initialNamespaces ALL_SPACES',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
        initialNamespaces: [ALL_SPACES_ID],
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
    }
  );

  apiTest(
    'default: should return 200 when creating isolated multi-namespace object with initialNamespaces in other space',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id, initialNamespaces, expectedNamespaces } =
        INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
        initialNamespaces,
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual(expectedNamespaces);
    }
  );

  apiTest(
    'default: should return 200 when creating multi-namespace object with initialNamespaces in each space',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id, initialNamespaces, expectedNamespaces } =
        INITIAL_NS_MULTI_NAMESPACE_OBJ_EACH_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
        initialNamespaces,
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual(expectedNamespaces);
    }
  );

  apiTest(
    'default: should return 200 when creating multi-namespace object with initialNamespaces ALL_SPACES',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id, initialNamespaces, expectedNamespaces } =
        INITIAL_NS_MULTI_NAMESPACE_OBJ_ALL_SPACES;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
        initialNamespaces,
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual(expectedNamespaces);
    }
  );

  apiTest(
    'default: should return 409 when creating object with alias conflict in all spaces',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = ALIAS_CONFLICT_OBJ;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
        initialNamespaces: ['*'],
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
      expect(body.error).toBe('Conflict');
    }
  );

  apiTest(
    'default: should return 409 when creating object with alias conflict in default space',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = ALIAS_CONFLICT_OBJ;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
      expect(body.error).toBe('Conflict');
    }
  );

  apiTest(
    'default+overwrite: should return 200 when overwriting dashboard that already exists',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = SINGLE_NAMESPACE_DEFAULT_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(
        `s/${spaceId}/api/saved_objects/${path}?overwrite=true`,
        {
          headers: COMMON_HEADERS,
          body: requestBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.type).toBe(type);
      expect(body.id).toBe(id);
      expect(body.attributes[NEW_ATTRIBUTE_KEY]).toBe(NEW_ATTRIBUTE_VAL);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'default+overwrite: should return 200 when overwriting multi-namespace object',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = MULTI_NAMESPACE_ALL_SPACES;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(
        `s/${spaceId}/api/saved_objects/${path}?overwrite=true`,
        {
          headers: COMMON_HEADERS,
          body: requestBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.type).toBe(type);
      expect(body.id).toBe(id);
    }
  );

  apiTest(
    'default+overwrite: should return 200 when overwriting namespace-agnostic object',
    async ({ apiClient }) => {
      const spaceId = DEFAULT_SPACE_ID;
      const { type, id } = NAMESPACE_AGNOSTIC;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(
        `s/${spaceId}/api/saved_objects/${path}?overwrite=true`,
        {
          headers: COMMON_HEADERS,
          body: requestBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.type).toBe(type);
      expect(body.id).toBe(id);
    }
  );

  apiTest(
    'space_1: should return 200 when creating object from default space',
    async ({ apiClient }) => {
      const spaceId = SPACE_1_ID;
      const { type, id } = SINGLE_NAMESPACE_DEFAULT_SPACE;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'space_1: should return 409 when creating object that exists in space_1',
    async ({ apiClient }) => {
      const spaceId = SPACE_1_ID;
      const { type, id } = SINGLE_NAMESPACE_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'space_1: should return 409 when creating multi-namespace object in default and space_1',
    async ({ apiClient }) => {
      const spaceId = SPACE_1_ID;
      const { type, id } = MULTI_NAMESPACE_DEFAULT_AND_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'space_1: should return 409 when creating multi-namespace object only in space_1',
    async ({ apiClient }) => {
      const spaceId = SPACE_1_ID;
      const { type, id } = MULTI_NAMESPACE_ONLY_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'space_1: should return 409 when creating object with alias conflict in space_1',
    async ({ apiClient }) => {
      const spaceId = SPACE_1_ID;
      const { type, id } = ALIAS_CONFLICT_OBJ;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'space_1+overwrite: should return 200 when overwriting object in space_1',
    async ({ apiClient }) => {
      const spaceId = SPACE_1_ID;
      const { type, id } = SINGLE_NAMESPACE_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(
        `s/${spaceId}/api/saved_objects/${path}?overwrite=true`,
        {
          headers: COMMON_HEADERS,
          body: requestBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'space_1+overwrite: should return 200 when overwriting multi-namespace object in space_1',
    async ({ apiClient }) => {
      const spaceId = SPACE_1_ID;
      const { type, id } = MULTI_NAMESPACE_ONLY_SPACE_1;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(
        `s/${spaceId}/api/saved_objects/${path}?overwrite=true`,
        {
          headers: COMMON_HEADERS,
          body: requestBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
    }
  );

  apiTest(
    'space_2: should return 409 when creating object that exists in space_2',
    async ({ apiClient }) => {
      const spaceId = SPACE_2_ID;
      const { type, id } = SINGLE_NAMESPACE_SPACE_2;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(409);
    }
  );

  apiTest(
    'space_2: should return 200 when creating object with alias (no conflict in space_2)',
    async ({ apiClient }) => {
      const spaceId = SPACE_2_ID;
      const { type, id } = ALIAS_CONFLICT_OBJ;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(`s/${spaceId}/api/saved_objects/${path}`, {
        headers: COMMON_HEADERS,
        body: requestBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  apiTest(
    'space_2+overwrite: should return 200 when overwriting object in space_2',
    async ({ apiClient }) => {
      const spaceId = SPACE_2_ID;
      const { type, id } = SINGLE_NAMESPACE_SPACE_2;
      const path = `${type}/${id}`;
      const requestBody = {
        attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
      };

      const { body, statusCode } = await apiClient.post(
        `s/${spaceId}/api/saved_objects/${path}?overwrite=true`,
        {
          headers: COMMON_HEADERS,
          body: requestBody,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.namespaces).toStrictEqual([spaceId]);
    }
  );

  */
});
