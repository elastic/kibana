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
  SavedObjectsImportOptions,
} from 'src/core/server';
import { copySavedObjectsToSpacesFactory } from './copy_to_spaces';
import { Readable } from 'stream';

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  importSavedObjectsImpl?: (opts: SavedObjectsImportOptions) => Promise<SavedObjectsImportResponse>;
}

describe('copySavedObjectsToSpaces', () => {
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
        importSavedObjects:
          opts.importSavedObjectsImpl ||
          jest.fn().mockImplementation(() => {
            const response: SavedObjectsImportResponse = {
              success: true,
              successCount: opts.objects.length,
            };

            return Promise.resolve(response);
          }),
      },
      types: ['dashboard', 'visualization', 'globalType'],
      schema: new SavedObjectsSchema({
        globalType: { isNamespaceAgnostic: true },
      }),
    } as unknown) as SavedObjectsService;

    const savedObjectsClient = (null as unknown) as SavedObjectsClientContract;

    return {
      savedObjectsClient,
      savedObjectsService,
    };
  };

  it('uses the Saved Objects Service to perform an export followed by a series of imports', async () => {
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

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjectsClient,
      savedObjectsService
    );

    const result = await copySavedObjectsToSpaces('sourceSpace', ['destination1', 'destination2'], {
      includeReferences: true,
      overwrite: true,
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
        },
      ],
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
            "savedObjectsClient": null,
            "types": Array [
              "dashboard",
              "visualization",
            ],
          },
        ],
      ]
    `);

    expect((savedObjectsService.importExport.importSavedObjects as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "namespace": "destination1",
            "objectLimit": 1000,
            "overwrite": true,
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
            "savedObjectsClient": null,
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
            "overwrite": true,
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
            "savedObjectsClient": null,
            "supportedTypes": Array [
              "dashboard",
              "visualization",
            ],
          },
        ],
      ]
    `);
  });

  it(`doesn't stop copy if some spaces fail`, async () => {
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
      importSavedObjectsImpl: opts => {
        if (opts.namespace === 'failure-space') {
          throw new Error(`Some error occurred!`);
        }
        return Promise.resolve({
          success: true,
          successCount: 3,
        });
      },
    });

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjectsClient,
      savedObjectsService
    );

    const result = await copySavedObjectsToSpaces(
      'sourceSpace',
      ['failure-space', 'non-existent-space', 'marketing'],
      {
        includeReferences: true,
        overwrite: true,
        objects: [
          {
            type: 'dashboard',
            id: 'my-dashboard',
          },
        ],
      }
    );

    expect(result).toMatchInlineSnapshot(`
            Object {
              "failure-space": Object {
                "errors": Array [
                  [Error: Some error occurred!],
                ],
                "success": false,
                "successCount": 0,
              },
              "marketing": Object {
                "errors": undefined,
                "success": true,
                "successCount": 3,
              },
              "non-existent-space": Object {
                "errors": undefined,
                "success": true,
                "successCount": 3,
              },
            }
        `);
  });
});
