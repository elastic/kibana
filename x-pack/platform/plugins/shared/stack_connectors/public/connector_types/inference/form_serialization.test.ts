/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formDeserializer, formSerializer } from './form_serialization';
import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';

describe('formSerializer', () => {
  it('should serialize form data with max_number_of_allocations', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          max_number_of_allocations: 5,
          other_config: 'value',
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const serializedData = formSerializer(formData);

    expect(serializedData).toEqual({
      ...formData,
      config: {
        providerConfig: {
          other_config: 'value',
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 0,
            max_number_of_allocations: 5,
          },
          num_threads: 1,
        },
      },
    });
  });

  it('should serialize form data with headers', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          other_config: 'value',
          headers: {
            'test-header-key-1': 'test-header-value-1',
            'test-header-key-2': 'test-header-value-2',
          },
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const serializedData = formSerializer(formData);

    expect(serializedData).toEqual({
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          other_config: 'value',
        },
        headers: {
          'test-header-key-1': 'test-header-value-1',
          'test-header-key-2': 'test-header-value-2',
        },
      },
      isDeprecated: false,
      secrets: {},
    });
  });

  it('should serialize form data with max_number_of_allocations and headers', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          max_number_of_allocations: 5,
          other_config: 'value',
          headers: {
            'test-header-key-1': 'test-header-value-1',
            'test-header-key-2': 'test-header-value-2',
          },
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const serializedData = formSerializer(formData);

    expect(serializedData).toEqual({
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          other_config: 'value',
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 0,
            max_number_of_allocations: 5,
          },
          num_threads: 1,
        },
        headers: {
          'test-header-key-1': 'test-header-value-1',
          'test-header-key-2': 'test-header-value-2',
        },
      },
      isDeprecated: false,
      secrets: {},
    });
  });

  it('should return form data unchanged if max_number_of_allocations and headers are not present', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          other_config: 'value',
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const serializedData = formSerializer(formData);

    expect(serializedData).toEqual(formData);
  });
});

describe('formDeserializer', () => {
  it('should deserialize form data with adaptive_allocations', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          adaptive_allocations: {
            max_number_of_allocations: 10,
            min_number_of_allocations: 0,
          },
          other_config: 'value',
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const deserializedData = formDeserializer(formData);

    expect(deserializedData).toEqual({
      ...formData,
      config: {
        providerConfig: {
          other_config: 'value',
          max_number_of_allocations: 10,
          adaptive_allocations: undefined,
        },
      },
    });
  });

  it('should deserialize form data with headers', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          other_config: 'value',
        },
        headers: {
          'test-header-key-1': 'test-header-value-1',
          'test-header-key-2': 'test-header-value-2',
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const deserializedData = formDeserializer(formData);

    expect(deserializedData).toEqual({
      ...formData,
      config: {
        providerConfig: {
          other_config: 'value',
          headers: {
            'test-header-key-1': 'test-header-value-1',
            'test-header-key-2': 'test-header-value-2',
          },
        },
      },
    });
  });

  it('should deserialize form data with adaptive_allocations and headers', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          adaptive_allocations: {
            max_number_of_allocations: 10,
            min_number_of_allocations: 0,
          },
          other_config: 'value',
        },
        headers: {
          'test-header-key-1': 'test-header-value-1',
          'test-header-key-2': 'test-header-value-2',
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const deserializedData = formDeserializer(formData);

    expect(deserializedData).toEqual({
      ...formData,
      config: {
        providerConfig: {
          other_config: 'value',
          max_number_of_allocations: 10,
          adaptive_allocations: undefined,
          headers: {
            'test-header-key-1': 'test-header-value-1',
            'test-header-key-2': 'test-header-value-2',
          },
        },
      },
    });
  });

  it('should return form data unchanged if adaptive_allocations and headers are not present', () => {
    const formData: ConnectorFormSchema = {
      actionTypeId: 'test.connector',
      config: {
        providerConfig: {
          other_config: 'value',
        },
      },
      isDeprecated: false,
      secrets: {},
    };

    const deserializedData = formDeserializer(formData);

    expect(deserializedData).toEqual(formData);
  });
});
