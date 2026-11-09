/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelDataBackfillChange,
} from '@kbn/core-saved-objects-server';
import {
  modelVersion1,
  modelVersion2,
  modelVersion3,
  modelVersion4,
  modelVersion5,
  modelVersion6,
  modelVersion7,
  modelVersion8,
  modelVersion9,
  modelVersion11,
  modelVersion12,
  modelVersion13,
  modelVersion14,
  modelVersion15,
  modelVersion16,
  modelVersion17,
  modelVersion18,
} from '.';

describe('Model versions', () => {
  describe('version 1', () => {
    it('returns version 1 changes correctly', () => {
      expect(modelVersion1.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "customFields": Object {
                "properties": Object {
                  "key": Object {
                    "type": "keyword",
                  },
                  "type": Object {
                    "type": "keyword",
                  },
                  "value": Object {
                    "fields": Object {
                      "boolean": Object {
                        "ignore_malformed": true,
                        "type": "boolean",
                      },
                      "date": Object {
                        "ignore_malformed": true,
                        "type": "date",
                      },
                      "ip": Object {
                        "ignore_malformed": true,
                        "type": "ip",
                      },
                      "number": Object {
                        "ignore_malformed": true,
                        "type": "long",
                      },
                      "string": Object {
                        "type": "text",
                      },
                    },
                    "type": "keyword",
                  },
                },
                "type": "nested",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 2', () => {
    it('returns version 2 changes correctly', () => {
      expect(modelVersion2.changes).toMatchInlineSnapshot(`
              Array [
                Object {
                  "addedMappings": Object {
                    "observables": Object {
                      "properties": Object {
                        "typeKey": Object {
                          "type": "keyword",
                        },
                        "value": Object {
                          "type": "keyword",
                        },
                      },
                      "type": "nested",
                    },
                  },
                  "type": "mappings_addition",
                },
              ]
          `);
    });
  });

  describe('version 3', () => {
    it('returns version 3 changes correctly', () => {
      expect(modelVersion3.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "incremental_id": Object {
                "type": "unsigned_long",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 4', () => {
    it('returns version 4 changes correctly', () => {
      expect(modelVersion4.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "incremental_id": Object {
                "fields": Object {
                  "keyword": Object {
                    "type": "keyword",
                  },
                },
                "type": "unsigned_long",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 5', () => {
    it('returns version 5 changes correctly', () => {
      expect(modelVersion5.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "incremental_id": Object {
                "fields": Object {
                  "keyword": Object {
                    "type": "keyword",
                  },
                  "text": Object {
                    "type": "text",
                  },
                },
                "type": "unsigned_long",
              },
              "settings": Object {
                "properties": Object {
                  "extractObservables": Object {
                    "type": "boolean",
                  },
                },
              },
            },
            "type": "mappings_addition",
          },
          Object {
            "backfillFn": [Function],
            "type": "data_backfill",
          },
        ]
      `);
    });
  });

  describe('version 6', () => {
    it('returns version 6 changes correctly', () => {
      expect(modelVersion6.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "total_events": Object {
                "type": "integer",
              },
            },
            "type": "mappings_addition",
          },
          Object {
            "backfillFn": [Function],
            "type": "data_backfill",
          },
        ]
      `);
    });
  });

  describe('version 7', () => {
    it('returns version 7 changes correctly', () => {
      expect(modelVersion7.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "observables": Object {
                "properties": Object {
                  "description": Object {
                    "type": "keyword",
                  },
                },
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });
  describe('version 8', () => {
    it('returns version 8 changes correctly', () => {
      expect(modelVersion8.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "total_observables": Object {
                "type": "integer",
              },
            },
            "type": "mappings_addition",
          },
          Object {
            "backfillFn": [Function],
            "type": "data_backfill",
          },
        ]
      `);
    });
  });

  describe('version 9', () => {
    it('returns version 9 changes correctly', () => {
      expect(modelVersion9.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "extended_fields": Object {
                "type": "flattened",
              },
              "template": Object {
                "properties": Object {
                  "id": Object {
                    "type": "keyword",
                  },
                  "version": Object {
                    "type": "integer",
                  },
                },
                "type": "object",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 11', () => {
    it('returns version 11 changes correctly', () => {
      expect(modelVersion11.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "extract_observables_source": Object {
                "ignore_above": 1024,
                "type": "keyword",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 12', () => {
    it('returns version 12 changes correctly', () => {
      expect(modelVersion12.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "status_key": Object {
                "type": "keyword",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 13', () => {
    it('returns version 13 changes correctly', () => {
      expect(modelVersion13.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "pause_reason": Object {
                "type": "keyword",
              },
              "paused_at": Object {
                "type": "date",
              },
              "resume_to_status_key": Object {
                "type": "keyword",
              },
              "time_paused": Object {
                "type": "long",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 14', () => {
    it('returns version 14 changes correctly', () => {
      expect(modelVersion14.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "access": Object {
                "properties": Object {
                  "mode": Object {
                    "type": "keyword",
                  },
                },
              },
            },
            "type": "mappings_addition",
          },
          Object {
            "backfillFn": [Function],
            "type": "data_backfill",
          },
        ]
      `);
    });

    it('backfills access.mode to default', () => {
      const backfill = modelVersion14.changes.find(
        (change): change is SavedObjectsModelDataBackfillChange => change.type === 'data_backfill'
      );
      const backfillFn = backfill?.backfillFn as SavedObjectModelDataBackfillFn;
      const doc = { id: 'case-1', type: 'cases', attributes: {} } as Parameters<
        typeof backfillFn
      >[0];
      const context = {} as Parameters<typeof backfillFn>[1];

      expect(backfillFn(doc, context)).toEqual({ attributes: { access: { mode: 'default' } } });
    });

    it('leaves a case that already has an access mode alone', () => {
      const backfill = modelVersion14.changes.find(
        (change): change is SavedObjectsModelDataBackfillChange => change.type === 'data_backfill'
      );
      const backfillFn = backfill?.backfillFn as SavedObjectModelDataBackfillFn;
      const doc = {
        id: 'case-1',
        type: 'cases',
        attributes: { access: { mode: 'restricted' } },
      } as Parameters<typeof backfillFn>[0];
      const context = {} as Parameters<typeof backfillFn>[1];

      expect(backfillFn(doc, context)).toEqual({ attributes: {} });
    });
  });

  describe('version 15', () => {
    it('returns version 15 changes correctly', () => {
      expect(modelVersion15.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "settings": Object {
                "properties": Object {
                  "externalSync": Object {
                    "properties": Object {
                      "autoPush": Object {
                        "type": "boolean",
                      },
                    },
                  },
                },
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });

  describe('version 16', () => {
    it('maps the outcome fields and the source, with no backfill', () => {
      expect(modelVersion16.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            close_reason: { type: 'keyword' },
            human_verdict: { type: 'keyword' },
            source: { type: 'keyword' },
            ai_verdict: { properties: { verdict: { type: 'keyword' } } },
          },
        },
      ]);
    });
  });

  describe('version 17', () => {
    it('maps the room conversation id, with no backfill', () => {
      expect(modelVersion17.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: { room_conversation_id: { type: 'keyword' } },
        },
      ]);
    });
  });

  describe('version 18', () => {
    it('maps the pending decisions counter, with no backfill', () => {
      expect(modelVersion18.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: { pending_decisions: { type: 'integer' } },
        },
      ]);
    });
  });
});
