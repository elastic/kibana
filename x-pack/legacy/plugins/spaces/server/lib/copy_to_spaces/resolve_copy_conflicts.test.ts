/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SavedObjectsSchema,
  SavedObjectsService,
  SavedObjectsClientContract,
  SavedObjectsImportResponse,
  SavedObjectsResolveImportErrorsOptions,
} from 'src/core/server';
import { Readable } from 'stream';
import { resolveCopySavedObjectsToSpacesConflictsFactory } from './resolve_copy_conflicts';

const NOT_FOUND_ERROR = Symbol('not-found-error');

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  resolveImportErrorsImpl?: (
    opts: SavedObjectsResolveImportErrorsOptions
  ) => Promise<SavedObjectsImportResponse>;
}

describe('resolveCopySavedObjectsToSpacesConflicts', () => {
  const setup = (opts: SetupOpts) => {
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
        resolveImportErrors:
          opts.resolveImportErrorsImpl ||
          jest.fn().mockImplementation(() => {
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
    };
  };

  it('uses the Saved Objects Service to perform an export followed by a series of conflict resolution calls', async () => {
    const { savedObjectsClient, savedObjectsService } = setup({
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
    const { savedObjectsClient, savedObjectsService } = setup({
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
      resolveImportErrorsImpl: opts => {
        if (opts.namespace === 'no-manage') {
          throw new Error(`Some error occurred!`);
        }
        return Promise.resolve({
          success: true,
          successCount: 3,
        });
      },
    });

    const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
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
            [Error: Some error occurred!],
          ],
          "success": false,
          "successCount": 0,
        },
        "not-found": Object {
          "errors": undefined,
          "success": true,
          "successCount": 3,
        },
      }
    `);
  });
});
