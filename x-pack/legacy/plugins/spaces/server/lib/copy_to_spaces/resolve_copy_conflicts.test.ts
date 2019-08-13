/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { spacesClientMock } from '../spaces_client/spaces_client.mock';
import {
  SavedObjectsSchema,
  SavedObjectsService,
  SavedObjectsClientContract,
  SavedObjectsImportResponse,
} from 'src/core/server';
import { copySavedObjectsToSpacesFactory } from './copy_to_spaces';
import { Readable } from 'stream';
import { Space } from '../../../common/model/space';
import { resolveCopySavedObjectsToSpacesConflictsFactory } from './resolve_copy_conflicts';

const NOT_FOUND_ERROR = Symbol('not-found-error');

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  canManageSavedObjectsImpl?: (spaceId: string) => Promise<boolean>;
  getSpaceImpl?: (spaceId: string) => Promise<Space>;
}

describe('resolveCopySavedObjectsToSpacesConflicts', () => {
  const setup = (opts: SetupOpts) => {
    const spacesClient = spacesClientMock.create();
    if (opts.canManageSavedObjectsImpl) {
      spacesClient.canManageSavedObjects = opts.canManageSavedObjectsImpl;
    }
    if (opts.getSpaceImpl) {
      spacesClient.get = opts.getSpaceImpl;
    }

    const savedObjectsService: SavedObjectsService = ({
      importExport: {
        objectLimit: 1000,
        getSortedObjectsForExport: jest.fn().mockResolvedValue(
          new Readable({
            objectMode: true,
            read() {
              opts.objects.forEach(o => this.push(o));

              this.push(null);
            },
          })
        ),
        resolveImportErrors: jest.fn().mockImplementation(() => {
          const response: SavedObjectsImportResponse = {
            success: true,
            successCount: opts.objects.length,
          };

          return response;
        }),
      },
      types: ['dashboard', 'visualization', 'globalType'],
      schema: new SavedObjectsSchema({
        globalType: { isNamespaceAgnostic: true },
      }),
    } as unknown) as SavedObjectsService;

    const savedObjectsClient: SavedObjectsClientContract = ({
      errors: {
        isNotFoundError: (e: unknown) => e === NOT_FOUND_ERROR,
      },
    } as unknown) as SavedObjectsClientContract;

    return {
      savedObjectsClient,
      savedObjectsService,
      spacesClient,
    };
  };

  it('uses the Saved Objects Service to perform an export followed by a series of conflict resolution calls', async () => {
    const { savedObjectsClient, savedObjectsService, spacesClient } = setup({
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {},
        },
        {
          type: 'visualization',
          id: 'my-viz',
          attributes: {},
        },
        {
          type: 'index-pattern',
          id: 'my-index-pattern',
          attributes: {},
        },
      ],
    });

    const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
      spacesClient,
      savedObjectsClient,
      savedObjectsService
    );

    const result = await resolveCopySavedObjectsToSpacesConflicts('sourceSpace', {
      includeReferences: true,
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
        },
      ],
      retries: {
        destination1: [
          {
            type: 'visualization',
            id: 'my-visualization',
            overwrite: true,
          },
        ],
        destination2: [
          {
            type: 'visualization',
            id: 'my-visualization',
            overwrite: false,
          },
        ],
      },
    });

    expect(result).toMatchInlineSnapshot(`
            Object {
              "destination1": Object {
                "errors": undefined,
                "success": true,
                "successCount": 3,
              },
              "destination2": Object {
                "errors": undefined,
                "success": true,
                "successCount": 3,
              },
            }
        `);

    expect((spacesClient.canManageSavedObjects as jest.Mock).mock.calls).toMatchInlineSnapshot(`
                                    Array [
                                      Array [
                                        "destination1",
                                      ],
                                      Array [
                                        "destination2",
                                      ],
                                    ]
                        `);

    expect((savedObjectsService.importExport.getSortedObjectsForExport as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
                              Array [
                                Array [
                                  Object {
                                    "exportSizeLimit": 1000,
                                    "includeReferencesDeep": true,
                                    "namespace": "sourceSpace",
                                    "objects": Array [
                                      Object {
                                        "id": "my-dashboard",
                                        "type": "dashboard",
                                      },
                                    ],
                                    "savedObjectsClient": Object {
                                      "errors": Object {
                                        "isNotFoundError": [Function],
                                      },
                                    },
                                    "types": Array [
                                      "dashboard",
                                      "visualization",
                                    ],
                                  },
                                ],
                              ]
                    `);

    expect((savedObjectsService.importExport.resolveImportErrors as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
            Array [
              Array [
                Object {
                  "namespace": "destination1",
                  "objectLimit": 1000,
                  "readStream": Rereadable {
                    "_events": Object {
                      "close": [Function],
                      "drain": [Function],
                      "error": [Function],
                      "finish": [Function],
                      "prefinish": [Function],
                      "unpipe": [Function],
                    },
                    "_eventsCount": 6,
                    "_maxListeners": undefined,
                    "_readableState": ReadableState {
                      "awaitDrain": 0,
                      "buffer": BufferList {
                        "head": null,
                        "length": 0,
                        "tail": null,
                      },
                      "decoder": null,
                      "defaultEncoding": "utf8",
                      "destroyed": false,
                      "emitClose": true,
                      "emittedReadable": false,
                      "encoding": null,
                      "endEmitted": false,
                      "ended": false,
                      "flowing": null,
                      "highWaterMark": 16,
                      "length": 0,
                      "needReadable": true,
                      "objectMode": true,
                      "paused": true,
                      "pipes": null,
                      "pipesCount": 0,
                      "readableListening": false,
                      "reading": false,
                      "readingMore": false,
                      "resumeScheduled": false,
                      "sync": false,
                    },
                    "_transformState": Object {
                      "afterTransform": [Function],
                      "needTransform": false,
                      "transforming": false,
                      "writecb": null,
                      "writechunk": null,
                      "writeencoding": null,
                    },
                    "_writableState": WritableState {
                      "bufferProcessing": false,
                      "bufferedRequest": null,
                      "bufferedRequestCount": 0,
                      "corked": 0,
                      "corkedRequestsFree": Object {
                        "entry": null,
                        "finish": [Function],
                        "next": null,
                      },
                      "decodeStrings": true,
                      "defaultEncoding": "utf8",
                      "destroyed": false,
                      "emitClose": true,
                      "ended": false,
                      "ending": false,
                      "errorEmitted": false,
                      "finalCalled": false,
                      "finished": false,
                      "highWaterMark": 16,
                      "lastBufferedRequest": null,
                      "length": 0,
                      "needDrain": false,
                      "objectMode": true,
                      "onwrite": [Function],
                      "pendingcb": 0,
                      "prefinished": false,
                      "sync": true,
                      "writecb": null,
                      "writelen": 0,
                      "writing": false,
                    },
                    "allowHalfOpen": true,
                    "chunks": Array [],
                    "readable": true,
                    "writable": true,
                  },
                  "retries": Array [
                    Object {
                      "id": "my-visualization",
                      "overwrite": true,
                      "replaceReferences": Array [],
                      "type": "visualization",
                    },
                  ],
                  "savedObjectsClient": Object {
                    "errors": Object {
                      "isNotFoundError": [Function],
                    },
                  },
                  "supportedTypes": Array [
                    "dashboard",
                    "visualization",
                  ],
                },
              ],
              Array [
                Object {
                  "namespace": "destination2",
                  "objectLimit": 1000,
                  "readStream": Readable {
                    "_events": Object {},
                    "_eventsCount": 0,
                    "_maxListeners": undefined,
                    "_read": [Function],
                    "_readableState": ReadableState {
                      "awaitDrain": 0,
                      "buffer": BufferList {
                        "head": null,
                        "length": 0,
                        "tail": null,
                      },
                      "decoder": null,
                      "defaultEncoding": "utf8",
                      "destroyed": false,
                      "emitClose": true,
                      "emittedReadable": false,
                      "encoding": null,
                      "endEmitted": false,
                      "ended": false,
                      "flowing": null,
                      "highWaterMark": 16,
                      "length": 0,
                      "needReadable": false,
                      "objectMode": true,
                      "paused": true,
                      "pipes": null,
                      "pipesCount": 0,
                      "readableListening": false,
                      "reading": false,
                      "readingMore": false,
                      "resumeScheduled": false,
                      "sync": true,
                    },
                    "readable": true,
                  },
                  "retries": Array [
                    Object {
                      "id": "my-visualization",
                      "overwrite": false,
                      "replaceReferences": Array [],
                      "type": "visualization",
                    },
                  ],
                  "savedObjectsClient": Object {
                    "errors": Object {
                      "isNotFoundError": [Function],
                    },
                  },
                  "supportedTypes": Array [
                    "dashboard",
                    "visualization",
                  ],
                },
              ],
            ]
        `);
  });

  it(`doesn't stop resolution if some spaces fail`, async () => {
    const { savedObjectsClient, savedObjectsService, spacesClient } = setup({
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {},
        },
        {
          type: 'visualization',
          id: 'my-viz',
          attributes: {},
        },
        {
          type: 'index-pattern',
          id: 'my-index-pattern',
          attributes: {},
        },
      ],
      canManageSavedObjectsImpl: (spaceId: string) => Promise.resolve(spaceId !== 'no-manage'),
      getSpaceImpl: (spaceId: string) => {
        if (spaceId === 'not-found') {
          throw NOT_FOUND_ERROR;
        }
        return Promise.resolve({
          id: spaceId,
          name: 'my space',
          disabledFeatures: [],
        });
      },
    });

    const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
      spacesClient,
      savedObjectsClient,
      savedObjectsService
    );

    const result = await resolveCopySavedObjectsToSpacesConflicts('sourceSpace', {
      includeReferences: true,
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
        },
      ],
      retries: {
        ['no-manage']: [
          {
            type: 'visualization',
            id: 'my-visualization',
            overwrite: true,
          },
        ],
        ['not-found']: [
          {
            type: 'visualization',
            id: 'my-visualization',
            overwrite: false,
          },
        ],
        ['marketing']: [
          {
            type: 'visualization',
            id: 'my-visualization',
            overwrite: true,
          },
        ],
      },
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "marketing": Object {
          "errors": undefined,
          "success": true,
          "successCount": 3,
        },
        "no-manage": Object {
          "errors": Array [
            Object {
              "error": Object {
                "spaceId": "no-manage",
                "type": "unauthorized_to_manage_saved_objects",
              },
            },
          ],
          "success": false,
          "successCount": 0,
        },
        "not-found": Object {
          "errors": Array [
            Object {
              "error": Object {
                "spaceId": "not-found",
                "type": "space_not_found",
              },
            },
          ],
          "success": false,
          "successCount": 0,
        },
      }
    `);
  });
});
