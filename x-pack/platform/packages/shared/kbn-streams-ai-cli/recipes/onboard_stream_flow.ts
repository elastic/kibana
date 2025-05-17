/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { Streams } from '@kbn/streams-schema';
import {
  describeStream,
  generatePanels,
  generateParsers,
  generateProcessors,
} from '@kbn/streams-ai';
import moment from 'moment';
import { inspect } from 'util';
import { v4 } from 'uuid';
import { callGenerateProcessors } from '../util/call_generate_processors';

runRecipe(
  {
    name: 'onboard_stream_flow',
    flags: {
      string: ['stream'],
      help: `
        --stream      The stream to onboard
        --apply       Whether to apply suggested changes
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, esClient, logger, log, signal, flags }) => {
    const streamGetResponse = await kibanaClient.fetch<Streams.WiredStream.GetResponse>(
      `/api/streams/${flags.stream}`
    );

    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'days').valueOf();

    const description = await describeStream({
      definition: streamGetResponse.stream,
      start,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
    });

    log.info(description);

    const streamGetResponseWithDescription = {
      ...streamGetResponse,
      stream: {
        ...streamGetResponse.stream,
        description,
      },
    };

    const parsers = await callGenerateProcessors(
      {
        esClient,
        flags,
        inferenceClient,
        kibanaClient,
        log,
        logger,
        signal,
        streamGetResponse: streamGetResponseWithDescription,
      },
      generateParsers
    );

    const streamGetResponseWithParsers = {
      ...streamGetResponseWithDescription,
      stream: {
        ...streamGetResponseWithDescription.stream,
        ingest: {
          ...streamGetResponseWithDescription.stream.ingest,
          processing: [...streamGetResponseWithDescription.stream.ingest.processing, ...parsers],
        },
      },
    };

    const processors = await callGenerateProcessors(
      {
        esClient,
        flags,
        inferenceClient,
        kibanaClient,
        log,
        logger,
        signal,
        streamGetResponse: streamGetResponseWithParsers,
      },
      ({ definition, validateProcessors }) => {
        return generateProcessors({
          definition,
          end,
          esClient,
          inferenceClient,
          logger,
          signal,
          start,
          validateProcessors: ({ samples, processors: nextProcessors }) => {
            const parsersWithId = parsers.map((parser) => ({ id: v4(), ...parser }));

            const parserIds = parsersWithId.map((parser) => parser.id);

            return validateProcessors({
              samples,
              processors: parsersWithId.concat(nextProcessors),
            }).then((state) => {
              return {
                ...state,
                validations: state.validations.filter((validation) => {
                  return !parserIds.includes(validation.processor.id);
                }),
              };
            });
          },
        });
      }
    );

    const streamGetResponseWithProcessors = {
      ...streamGetResponseWithParsers,
      stream: {
        ...streamGetResponseWithParsers.stream,
        ingest: {
          ...streamGetResponseWithParsers.stream.ingest,
          processing: [...streamGetResponseWithParsers.stream.ingest.processing, ...processors],
        },
      },
    };

    const panels = await generatePanels({
      definition: streamGetResponseWithProcessors.stream,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      start,
    });

    log.info(
      inspect(
        {
          description,
          parsers,
          processors,
          panels,
        },
        { depth: null }
      )
    );
  }
);
