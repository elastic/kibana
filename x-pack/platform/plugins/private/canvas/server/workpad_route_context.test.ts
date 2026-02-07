/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import type { AwaitedProperties } from '@kbn/utility-types';
import type { RequestHandlerContext, SavedObjectReference } from '@kbn/core/server';
import { savedObjectsClientMock, coreMock } from '@kbn/core/server/mocks';

import { CANVAS_TYPE } from '../common/lib/constants';
import { encode } from '../common/lib/embeddable_dataurl';
import type { CanvasWorkpad } from '../types';

import { createWorkpadRouteContext } from './workpad_route_context';

jest.mock('./kibana_services', () => ({
  embeddableService: {
    getTransforms: () => ({
      transformIn: jest.fn((config: any) => {
        const { savedObjectId, ...remainingConfig } = config;
        return {
          state: { ...remainingConfig },
          references: [
            { id: savedObjectId, name: 'savedObjectRef', type: 'lens' },
          ] as SavedObjectReference[],
        };
      }),
      transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
        return { ...config, savedObjectId: references![0].id };
      }),
    }),
  },
}));

const runtimeExpression = `embeddable type="lens" 
  config="${encode({
    title: 'Test lens embeddable',
    savedObjectId: 'test-id',
  })}"`;

const storedExpression = `embeddable type="lens" config="${encode({
  title: 'Test lens embeddable',
})}"`;

const runtimeWorkpad = {
  id: 'workpad-id',
  pages: [
    {
      elements: [
        {
          id: 'element-id',
          expression: runtimeExpression,
        },
      ],
    },
  ],
};

const storedWorkpad = {
  pages: [
    {
      elements: [
        {
          id: 'element-id',
          expression: storedExpression,
        },
      ],
    },
  ],
};

const references: SavedObjectReference[] = [
  { id: 'test-id', name: 'savedObjectRef', type: 'lens' },
];

const savedObjectsClient = savedObjectsClientMock.create();

const mockContext = {
  core: {
    savedObjects: {
      client: savedObjectsClient,
    },
  },
} as unknown as AwaitedProperties<RequestHandlerContext>;

const workpadRouteContext = createWorkpadRouteContext();

const now = new Date();

describe('workpad route context', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    jest.resetAllMocks();
    clock = sinon.useFakeTimers(now);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('CREATE', () => {
    it('applies transformIn before saving', async () => {
      const expectedBody = {
        '@created': now.toISOString(),
        '@timestamp': now.toISOString(),
        ...storedWorkpad,
      };

      const canvasContext = await workpadRouteContext(
        coreMock.createCustomRequestHandlerContext(mockContext),
        undefined as any,
        undefined as any
      );

      const soResponse = {};
      (mockContext.core.savedObjects.client.create as jest.Mock).mockResolvedValue(soResponse);

      const result = await canvasContext.workpad.create(runtimeWorkpad as CanvasWorkpad);

      expect(mockContext.core.savedObjects.client.create).toBeCalledWith(
        CANVAS_TYPE,
        expectedBody,
        {
          id: runtimeWorkpad.id,
          references,
        }
      );

      expect(result).toBe(soResponse);
    });
  });

  describe('GET', () => {
    it('applies transformOut to the workpad saved object', async () => {
      const id = 'so-id';
      const canvasContext = await workpadRouteContext(
        coreMock.createCustomRequestHandlerContext(mockContext),
        undefined as any,
        undefined as any
      );

      (mockContext.core.savedObjects.client.get as jest.Mock).mockResolvedValue({
        attributes: storedWorkpad,
        references,
      });

      const result = await canvasContext.workpad.get(id);
      const { id: ingnoredId, ...expectedAttributes } = runtimeWorkpad;

      expect(mockContext.core.savedObjects.client.get).toBeCalledWith(CANVAS_TYPE, id);
      expect(result.attributes).toEqual(expectedAttributes);
    });
  });

  describe('RESOLVE', () => {
    it('applies transformOut to the workpad saved object', async () => {
      const id = 'so-id';
      const canvasContext = await workpadRouteContext(
        coreMock.createCustomRequestHandlerContext(mockContext),
        undefined as any,
        undefined as any
      );

      (mockContext.core.savedObjects.client.resolve as jest.Mock).mockResolvedValue({
        saved_object: { attributes: storedWorkpad, references },
        outcome: 'exactMatch',
      });

      const result = await canvasContext.workpad.resolve(id);
      const { id: ingnoredId, ...expectedAttributes } = runtimeWorkpad;

      expect(mockContext.core.savedObjects.client.resolve).toBeCalledWith(CANVAS_TYPE, id);
      expect(result.saved_object.attributes).toEqual(expectedAttributes);
    });
  });

  describe('UPDATE', () => {
    it('applies transformIn before saving', async () => {
      const id = 'workpad-id';
      const createdDate = new Date(2020, 1, 1).toISOString();

      const canvasContext = await workpadRouteContext(
        coreMock.createCustomRequestHandlerContext(mockContext),
        undefined as any,
        undefined as any
      );

      (mockContext.core.savedObjects.client.get as jest.Mock).mockReturnValue({
        attributes: {
          ...storedWorkpad,
          '@created': createdDate,
        },
        references,
      });

      const updatedRuntimeExpression = `embeddable type="lens" 
config="${encode({
        savedObjectId: 'test-id',
        title: 'Test lens embeddable with a new title',
      })}"`;
      const updatedStoredExpression = `embeddable type="lens" config="${encode({
        title: 'Test lens embeddable with a new title',
      })}"`;

      const updatedRuntimeWorkpad = {
        id: 'workpad-id',
        pages: [
          {
            elements: [
              {
                id: 'new-element-id',
                expression: updatedRuntimeExpression,
              },
            ],
          },
        ],
      };

      const updatedStoredWorkpad = {
        '@created': createdDate,
        '@timestamp': now.toISOString(),
        pages: [
          {
            elements: [
              {
                id: 'new-element-id',
                expression: updatedStoredExpression,
              },
            ],
          },
        ],
      };

      await canvasContext.workpad.update(id, updatedRuntimeWorkpad as CanvasWorkpad);
      expect(mockContext.core.savedObjects.client.create).toBeCalledWith(
        CANVAS_TYPE,
        updatedStoredWorkpad,
        {
          id,
          references,
          overwrite: true,
        }
      );
    });
  });
});
