/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deserializeComponentTemplate,
  serializeComponentTemplate,
} from './component_template_serialization';

describe('Component template serialization', () => {
  describe('deserializeComponentTemplate()', () => {
    test('deserializes a component template', () => {
      expect(
        deserializeComponentTemplate(
          {
            name: 'my_component_template',
            component_template: {
              version: 1,
              _meta: {
                serialization: {
                  id: 10,
                  class: 'MyComponentTemplate',
                },
                description: 'set number of shards to one',
              },
              template: {
                settings: {
                  number_of_shards: 1,
                },
                mappings: {
                  _source: {
                    enabled: false,
                  },
                  properties: {
                    host_name: {
                      type: 'keyword',
                    },
                    created_at: {
                      type: 'date',
                      format: 'EEE MMM dd HH:mm:ss Z yyyy',
                    },
                  },
                },
              },
            },
          },
          [
            {
              name: 'my_index_template',
              index_template: {
                index_patterns: ['foo'],
                template: {
                  settings: {
                    number_of_replicas: 2,
                  },
                },
                composed_of: ['my_component_template'],
              },
            },
          ]
        )
      ).toEqual({
        deprecated: undefined,
        name: 'my_component_template',
        version: 1,
        _meta: {
          serialization: {
            id: 10,
            class: 'MyComponentTemplate',
          },
          description: 'set number of shards to one',
        },
        template: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            _source: {
              enabled: false,
            },
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
        _kbnMeta: {
          usedBy: ['my_index_template'],
          isManaged: false,
        },
      });
    });

    test('does not migrate deprecated mappings._source.mode to index.mapping.source.mode on deserialize', () => {
      expect(
        deserializeComponentTemplate(
          {
            name: 'my_component_template',
            component_template: {
              template: {
                mappings: {
                  _source: {
                    mode: 'stored',
                    includes: ['a'],
                  },
                },
              },
            },
          },
          []
        )
      ).toHaveProperty('template', {
        mappings: {
          _source: {
            mode: 'stored',
            includes: ['a'],
          },
        },
      });
    });

    test('does not migrate enabled _source property - it remains represented via _source.enabled', () => {
      expect(
        deserializeComponentTemplate(
          {
            name: 'my_component_template',
            component_template: {
              template: {
                mappings: {
                  _source: {
                    enabled: false,
                  },
                },
              },
            },
          },
          []
        )
      ).toHaveProperty('template', {
        mappings: {
          _source: {
            enabled: false,
          },
        },
      });
    });
  });

  describe('serializeComponentTemplate()', () => {
    const deserializedComponentTemplate = {
      name: 'my_component_template',
      version: 1,
      _kbnMeta: {
        usedBy: [],
        isManaged: false,
      },
      _meta: {
        serialization: {
          id: 10,
          class: 'MyComponentTemplate',
        },
        description: 'set number of shards to one',
      },
      template: {
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          _source: {
            enabled: false,
          },
          properties: {
            host_name: {
              type: 'keyword',
            },
            created_at: {
              type: 'date',
              format: 'EEE MMM dd HH:mm:ss Z yyyy',
            },
          },
        },
      },
    };
    test('serialize a component template', () => {
      expect(serializeComponentTemplate(deserializedComponentTemplate)).toEqual({
        version: 1,
        _meta: {
          serialization: {
            id: 10,
            class: 'MyComponentTemplate',
          },
          description: 'set number of shards to one',
        },
        template: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            _source: {
              enabled: false,
            },
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
      });
    });

    test('migrates deprecated mappings._source.mode to index.mapping.source.mode on serialize', () => {
      expect(
        serializeComponentTemplate({
          ...deserializedComponentTemplate,
          template: {
            ...deserializedComponentTemplate.template,
            mappings: {
              ...deserializedComponentTemplate.template.mappings,
              _source: {
                mode: 'synthetic',
                excludes: ['b'],
              },
            },
          },
        })
      ).toHaveProperty('template', {
        settings: {
          number_of_shards: 1,
          index: {
            mapping: {
              source: {
                mode: 'synthetic',
              },
            },
          },
        },
        mappings: {
          _source: {
            excludes: ['b'],
          },
          properties: deserializedComponentTemplate.template.mappings.properties,
        },
      });
    });

    test('does not include _source.mode in mappings when it is the only mappings value', () => {
      expect(
        serializeComponentTemplate({
          ...deserializedComponentTemplate,
          template: {
            ...deserializedComponentTemplate.template,
            mappings: {
              _source: {
                mode: 'synthetic',
              },
            },
          },
        })
      ).toHaveProperty('template', {
        settings: {
          number_of_shards: 1,
          index: {
            mapping: {
              source: {
                mode: 'synthetic',
              },
            },
          },
        },
      });
    });

    test('does not migrate enabled _source property - it remains represented via _source.enabled', () => {
      expect(
        serializeComponentTemplate({
          ...deserializedComponentTemplate,
          template: {
            ...deserializedComponentTemplate.template,
            mappings: {
              ...deserializedComponentTemplate.template.mappings,
              _source: {
                enabled: false,
              },
            },
          },
        })
      ).toHaveProperty('template', {
        ...deserializedComponentTemplate.template,
        mappings: {
          ...deserializedComponentTemplate.template.mappings,
          _source: {
            enabled: false,
          },
        },
      });
    });

    test('serialize a component template with data stream options', () => {
      expect(
        serializeComponentTemplate(deserializedComponentTemplate, {
          failure_store: { enabled: true },
        })
      ).toEqual({
        version: 1,
        _meta: {
          serialization: {
            id: 10,
            class: 'MyComponentTemplate',
          },
          description: 'set number of shards to one',
        },
        template: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            _source: {
              enabled: false,
            },
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
          data_stream_options: {
            failure_store: { enabled: true },
          },
        },
      });
    });
  });
});
