/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActorRefFrom, SnapshotFrom } from 'xstate5';
import { assign, fromPromise, setup } from 'xstate5';
import { Streams } from '@kbn/streams-schema';
import { getAdvancedParameters } from '@kbn/streams-schema';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { SchemaField } from '../../../schema_editor/types';

export interface SchemaFieldsActorInput {
  definition: Streams.ingest.all.GetResponse;
}

export interface SchemaFieldsActorDeps {
  data: DataPublicPluginStart;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export interface SchemaFieldsActorContext {
  definition: Streams.ingest.all.GetResponse;
  fields: SchemaField[];
  dataViewFields: Awaited<ReturnType<DataPublicPluginStart['dataViews']['getFieldsForWildcard']>>;
  unmappedFields: string[];
}

export type SchemaFieldsActorEvent =
  | { type: 'definition.update'; definition: Streams.ingest.all.GetResponse }
  | { type: 'fields.refresh' };

export type SchemaFieldsActorRef = ActorRefFrom<typeof schemaFieldsActor>;
export type SchemaFieldsActorSnapshot = SnapshotFrom<typeof schemaFieldsActor>;

/**
 * Actor to fetch unmapped fields from the API
 */
function createFetchUnmappedFieldsActor(deps: SchemaFieldsActorDeps) {
  return fromPromise<string[], { definition: Streams.ingest.all.GetResponse; signal: AbortSignal }>(
    async ({ input }) => {
      const response = await deps.streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/schema/unmapped_fields',
        {
          signal: input.signal,
          params: {
            path: {
              name: input.definition.stream.name,
            },
          },
        }
      );
      return response.unmappedFields;
    }
  );
}

/**
 * Actor to fetch data view fields
 */
function createFetchDataViewFieldsActor(deps: SchemaFieldsActorDeps) {
  return fromPromise<
    Awaited<ReturnType<DataPublicPluginStart['dataViews']['getFieldsForWildcard']>>,
    { definition: Streams.ingest.all.GetResponse; signal: AbortSignal }
  >(async ({ input }) => {
    return deps.data.dataViews.getFieldsForWildcard({
      pattern: input.definition.stream.name,
      abortSignal: input.signal,
      forceRefresh: true,
    });
  });
}

/**
 * Get fields defined in the stream definition
 */
export const getDefinitionFields = (definition: Streams.ingest.all.GetResponse): SchemaField[] => {
  let inheritedFields: SchemaField[] = [];

  if (Streams.WiredStream.GetResponse.is(definition)) {
    inheritedFields = Object.entries(definition.inherited_fields).map(([name, field]) => ({
      name,
      type: field.type,
      format: 'format' in field ? field.format : undefined,
      additionalParameters: getAdvancedParameters(name, field),
      parent: field.from,
      alias_for: field.alias_for,
      status: 'inherited',
    }));
  }

  const mappedFields: SchemaField[] = Object.entries(
    Streams.WiredStream.GetResponse.is(definition)
      ? definition.stream.ingest.wired.fields
      : definition.stream.ingest.classic.field_overrides || {}
  ).map(([name, field]) => ({
    name,
    type: field.type,
    format: 'format' in field ? field.format : undefined,
    additionalParameters: getAdvancedParameters(name, field),
    parent: definition.stream.name,
    status: 'mapped',
  }));

  return [...inheritedFields, ...mappedFields];
};

/**
 * Combine all field sources into the final fields list
 */
function deriveFields(context: SchemaFieldsActorContext): SchemaField[] {
  const definitionFields = getDefinitionFields(context.definition);
  const allManagedFieldsSet = new Set([...definitionFields.map((field) => field.name)]);

  const unmanagedFields: SchemaField[] = context.dataViewFields
    ? context.dataViewFields
        .filter(
          (field) =>
            !field.runtimeField && !field.metadata_field && !allManagedFieldsSet.has(field.name)
        )
        .map((field) => ({
          name: field.name,
          status: 'unmapped',
          esType: field.esTypes?.[0],
          parent: context.definition.stream.name,
        }))
    : [];

  const allFoundFieldsSet = new Set([
    ...definitionFields.map((field) => field.name),
    ...unmanagedFields.map((field) => field.name),
  ]);

  const unmappedFieldsFromApi: SchemaField[] = context.unmappedFields
    .filter((field) => !allFoundFieldsSet.has(field))
    .map((field) => ({
      name: field,
      parent: context.definition.stream.name,
      status: 'unmapped',
    }));

  return [...definitionFields, ...unmanagedFields, ...unmappedFieldsFromApi];
}

export function createSchemaFieldsActor(deps: SchemaFieldsActorDeps) {
  return setup({
    types: {
      input: {} as SchemaFieldsActorInput,
      context: {} as SchemaFieldsActorContext,
      events: {} as SchemaFieldsActorEvent,
    },
    actors: {
      fetchUnmappedFields: getPlaceholderFor(() => createFetchUnmappedFieldsActor(deps)),
      fetchDataViewFields: getPlaceholderFor(() => createFetchDataViewFieldsActor(deps)),
    },
    actions: {
      storeDefinition: assign((_, params: { definition: Streams.ingest.all.GetResponse }) => ({
        definition: params.definition,
      })),
      storeUnmappedFields: assign((_, params: { unmappedFields: string[] }) => ({
        unmappedFields: params.unmappedFields,
      })),
      storeDataViewFields: assign(
        (
          _,
          params: {
            dataViewFields: Awaited<
              ReturnType<DataPublicPluginStart['dataViews']['getFieldsForWildcard']>
            >;
          }
        ) => ({
          dataViewFields: params.dataViewFields,
        })
      ),
      deriveFields: assign(({ context }) => ({
        fields: deriveFields(context),
      })),
    },
  }).createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiAZQFEBhAeQG0AGAXUVAAcB7WAAN6sSNxAAPRAFoAzAHYAHFIDMigKwAOAEwBWJZoDsATj16ANCACeiLQBYbu5VoUHtC-VoUWAvr5NUDGx8IlJyCmo6AEkAcRoAGTReAhJyCjQQGh4-Gg4uXiRBESQQCWlZBSUEDU01CwU9XQsLLXdjUwQvLS1+g30vUZGLe2NzHwC0DHwiUkoaOgZo2PiU-jTJbNy8gpEyiuqauoamlrabU3qDMx19Y1tB9wHzJRc3SY8vBwsdS2NBix9MyGIYaEYjMZmKyWN4uABKPGBaUBGT2BUOOxOZ0uGiq13IDyMbW07R0imaCH+jl6OgsTj0vT8kx8SkaFhsHhc5J2ZIk5IIFNIbL+tRqCDq+lUrJ0HMutj0Zi5ZT5QQCiWFaSoGSSckS8ooqHVWu1JUMioQej6KiUrWUwyM-RcjUa-LcFhNdPBzm8vQstltCCW0s29PtiodpVUWh0c3d5q1OkGVnaTjcRl6llWa1cWia4Z8YdIEfIOPYAGUABIACTLdBr+zryqNKr0Hk+7l6OkMfxshjcKlGHM5Ol+M0TE2Z+lpthavRUSfB7FrCQAYgBlACSXfrLbO4-eaY+k29eZsjO+OqNXOs-L+fiFi2jM+CraSXDRJ2B24oFIwKLLsu7tse6DoPuoDYAA0gA4gACgAtMhqEYVhOE5PsGBUJuGiBq4p4BuqBmMkybQ2gydoGp6HhCAB-bWKuzSuiWL7ej+v5UFwcCQnEUBwAASpRu7qgoYFUUy+wMkB+geCBbRBnyujeEyxrfMGYGaJoAF+kyikmv+mBAA */
    id: 'schemaFields',
    context: ({ input }) => ({
      definition: input.definition,
      fields: [],
      dataViewFields: [],
      unmappedFields: [],
    }),
    initial: 'loading',
    states: {
      loading: {
        type: 'parallel',
        states: {
          unmappedFields: {
            initial: 'fetching',
            states: {
              fetching: {
                invoke: {
                  src: 'fetchUnmappedFields',
                  input: ({ context }) => ({
                    definition: context.definition,
                    signal: new AbortController().signal,
                  }),
                  onDone: {
                    target: 'success',
                    actions: [
                      {
                        type: 'storeUnmappedFields',
                        params: ({ event }) => ({ unmappedFields: event.output as string[] }),
                      },
                    ],
                  },
                  onError: {
                    target: 'success',
                    actions: [{ type: 'storeUnmappedFields', params: { unmappedFields: [] } }],
                  },
                },
              },
              success: {
                type: 'final',
              },
            },
          },
          dataViewFields: {
            initial: 'fetching',
            states: {
              fetching: {
                invoke: {
                  src: 'fetchDataViewFields',
                  input: ({ context }) => ({
                    definition: context.definition,
                    signal: new AbortController().signal,
                  }),
                  onDone: {
                    target: 'success',
                    actions: [
                      {
                        type: 'storeDataViewFields',
                        params: ({ event }) => ({
                          dataViewFields: event.output as Awaited<
                            ReturnType<DataPublicPluginStart['dataViews']['getFieldsForWildcard']>
                          >,
                        }),
                      },
                    ],
                  },
                  onError: {
                    target: 'success',
                    actions: [{ type: 'storeDataViewFields', params: { dataViewFields: [] } }],
                  },
                },
              },
              success: {
                type: 'final',
              },
            },
          },
        },
        onDone: {
          target: 'ready',
          actions: ['deriveFields'],
        },
      },
      ready: {
        on: {
          'definition.update': {
            target: 'loading',
            actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
          },
          'fields.refresh': {
            target: 'loading',
          },
        },
      },
    },
  });
}

export const schemaFieldsActor = createSchemaFieldsActor({
  data: {} as DataPublicPluginStart,
  streamsRepositoryClient: {} as StreamsRepositoryClient,
});
