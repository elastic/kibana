/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import { parse } from 'yaml';
import type { Type } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { AddVersionOpts, VersionedRouteValidation } from '@kbn/core-http-server';
import { loggerMock } from '@kbn/logging-mocks';
import { registerAiIndexRoutes } from './ai_indices';

interface ExampleMediaType {
  content: { 'application/json': { examples: Record<string, { value: unknown }> } };
}

interface CodeSample {
  lang: string;
  source: string;
}

interface ExampleFile {
  requestBody?: ExampleMediaType;
  responses: Record<string, ExampleMediaType>;
  'x-codeSamples'?: CodeSample[];
}

type RouteOpts = AddVersionOpts<unknown, unknown, unknown>;

const registered: Array<{ route: string; opts: RouteOpts }> = [];

const captureMethod =
  (method: string) =>
  ({ path }: { path: string }) => {
    const builder = {
      addVersion: (opts: RouteOpts) => {
        registered.push({ route: `${method} ${path}`, opts });
        return builder;
      },
    };
    return builder;
  };

registerAiIndexRoutes({
  router: {
    versioned: {
      get: captureMethod('GET'),
      post: captureMethod('POST'),
      put: captureMethod('PUT'),
      delete: captureMethod('DELETE'),
    },
  } as unknown as IRouter,
  logger: loggerMock.create(),
  getAiIndexService: jest.fn(),
  getAiIndexDataReadService: jest.fn(),
  getImprovementsService: jest.fn(),
  getScheduleService: jest.fn(),
  getActions: jest.fn(),
  getAgentBuilder: jest.fn(),
  getWorkflowsManagementApi: jest.fn(),
  getSpaces: jest.fn(),
});

const routesWithExamples = registered.flatMap(({ route, opts }) => {
  const examplePath = opts.options?.oasOperationObject?.();
  if (typeof examplePath !== 'string' || opts.validate === false) {
    return [];
  }
  const validation: VersionedRouteValidation<unknown, unknown, unknown> =
    typeof opts.validate === 'function' ? opts.validate() : opts.validate;
  const examples: ExampleFile = parse(fs.readFileSync(examplePath, 'utf8'));
  return [{ route, validation, examples }];
});

const examplesOf = ({ content }: ExampleMediaType) =>
  Object.entries(content['application/json'].examples).map(
    ([name, { value }]) => [name, value] as const
  );

const codeSampleBody = ({ lang, source }: CodeSample) =>
  JSON.parse(
    lang === 'curl' ? /-d '([\s\S]*)'/.exec(source)?.[1] ?? '' : source.slice(source.indexOf('\n'))
  );

describe('AI index route examples', () => {
  it('covers every route that links an example file', () => {
    expect(routesWithExamples).toHaveLength(7);
  });

  describe.each(routesWithExamples)('$route', ({ validation, examples }) => {
    const responseSchemas = validation.response ?? {};
    const declaredStatuses = Object.keys(responseSchemas).filter((key) => /^\d+$/.test(key));

    it('has an example for exactly the declared response statuses', () => {
      expect(Object.keys(examples.responses).sort()).toEqual(declaredStatuses.sort());
    });

    it.each(
      Object.entries(examples.responses).flatMap(([status, media]) =>
        examplesOf(media).map(([name, value]) => ({ status, name, value }))
      )
    )('response $status example $name matches its schema', ({ status, value }) => {
      const bodySchema = responseSchemas[Number(status)]?.body as () => Type<unknown>;
      expect(() => bodySchema().validate(value)).not.toThrow();
    });

    const requestBodySchema = validation.request?.body as Type<unknown> | undefined;
    if (requestBodySchema && examples.requestBody) {
      it.each(examplesOf(examples.requestBody))(
        'request example %s matches the body schema',
        (_name, value) => {
          expect(() => requestBodySchema.validate(value)).not.toThrow();
        }
      );
    }

    if (examples.requestBody) {
      const [[, requestExample]] = examplesOf(examples.requestBody);
      it.each(examples['x-codeSamples'] ?? [])(
        '$lang code sample sends the request example',
        (sample) => {
          expect(codeSampleBody(sample)).toEqual(requestExample);
        }
      );
    }
  });
});
