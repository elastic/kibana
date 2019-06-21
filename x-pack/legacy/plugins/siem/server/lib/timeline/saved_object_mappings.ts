/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchMappingOf } from '../../utils/typed_elasticsearch_mappings';
import { SavedTimeline } from './types';

export const timelineSavedObjectType = 'siem-ui-timeline';

export const timelineSavedObjectMappings: {
  [timelineSavedObjectType]: ElasticsearchMappingOf<SavedTimeline>;
} = {
  [timelineSavedObjectType]: {
    properties: {
      columns: {
        properties: {
          aggregatable: {
            type: 'boolean',
          },
          category: {
            type: 'keyword',
          },
          columnHeaderType: {
            type: 'keyword',
          },
          description: {
            type: 'text',
          },
          example: {
            type: 'text',
          },
          indexes: {
            type: 'keyword',
          },
          id: {
            type: 'keyword',
          },
          name: {
            type: 'text',
          },
          placeholder: {
            type: 'text',
          },
          searchable: {
            type: 'boolean',
          },
          type: {
            type: 'keyword',
          },
        },
      },
      dataProviders: {
        properties: {
          id: {
            type: 'keyword',
          },
          name: {
            type: 'text',
          },
          enabled: {
            type: 'boolean',
          },
          excluded: {
            type: 'boolean',
          },
          kqlQuery: {
            type: 'text',
          },
          queryMatch: {
            properties: {
              field: {
                type: 'text',
              },
              displayField: {
                type: 'text',
              },
              value: {
                type: 'text',
              },
              displayValue: {
                type: 'text',
              },
              operator: {
                type: 'text',
              },
            },
          },
          and: {
            properties: {
              id: {
                type: 'keyword',
              },
              name: {
                type: 'text',
              },
              enabled: {
                type: 'boolean',
              },
              excluded: {
                type: 'boolean',
              },
              kqlQuery: {
                type: 'text',
              },
              queryMatch: {
                properties: {
                  field: {
                    type: 'text',
                  },
                  displayField: {
                    type: 'text',
                  },
                  value: {
                    type: 'text',
                  },
                  displayValue: {
                    type: 'text',
                  },
                  operator: {
                    type: 'text',
                  },
                },
              },
            },
          },
        },
      },
      description: {
        type: 'text',
      },
      favorite: {
        properties: {
          keySearch: {
            type: 'text',
          },
          fullName: {
            type: 'text',
          },
          userName: {
            type: 'text',
          },
          favoriteDate: {
            type: 'date',
          },
        },
      },
      kqlMode: {
        type: 'keyword',
      },
      kqlQuery: {
        properties: {
          filterQuery: {
            properties: {
              kuery: {
                properties: {
                  kind: {
                    type: 'keyword',
                  },
                  expression: {
                    type: 'text',
                  },
                },
              },
              serializedQuery: {
                type: 'text',
              },
            },
          },
        },
      },
      title: {
        type: 'text',
      },
      dateRange: {
        properties: {
          start: {
            type: 'date',
          },
          end: {
            type: 'date',
          },
        },
      },
      sort: {
        properties: {
          columnId: {
            type: 'keyword',
          },
          sortDirection: {
            type: 'keyword',
          },
        },
      },
      created: {
        type: 'date',
      },
      createdBy: {
        type: 'text',
      },
      updated: {
        type: 'date',
      },
      updatedBy: {
        type: 'text',
      },
    },
  },
};
