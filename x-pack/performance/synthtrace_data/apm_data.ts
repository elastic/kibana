/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, httpExitSpan, timerange } from '@kbn/apm-synthtrace-client';
import { Readable } from 'stream';

export function generateApmData({ from, to }: { from: Date; to: Date }) {
  const range = timerange(from.toISOString(), to.toISOString());
  const transactionName = '240rpm/75% 1000ms';

  const synthRum = apm
    .service({ name: 'synth-rum', environment: 'production', agentName: 'rum-js' })
    .instance('my-instance');
  const synthNode = apm
    .service({ name: 'synth-node', environment: 'production', agentName: 'nodejs' })
    .instance('my-instance');
  const synthGo = apm
    .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
    .instance('my-instance');

  const data = range.interval('1m').generator((timestamp) => {
    return synthRum
      .transaction({ transactionName })
      .duration(400)
      .timestamp(timestamp)
      .children(
        // synth-rum -> synth-node
        synthRum
          .span(
            httpExitSpan({
              spanName: 'GET /api/products/top',
              destinationUrl: 'http://synth-node:3000',
            })
          )
          .duration(300)
          .timestamp(timestamp)

          .children(
            // synth-node
            synthNode
              .transaction({ transactionName: 'Initial transaction in synth-node' })
              .duration(300)
              .timestamp(timestamp)
              .children(
                synthNode
                  // synth-node -> synth-go
                  .span(
                    httpExitSpan({
                      spanName: 'GET synth-go:3000',
                      destinationUrl: 'http://synth-go:3000',
                    })
                  )
                  .timestamp(timestamp)
                  .duration(400)

                  .children(
                    // synth-go
                    synthGo

                      .transaction({ transactionName: 'Initial transaction in synth-go' })
                      .timestamp(timestamp)
                      .duration(200)
                      .children(
                        synthGo
                          .span({ spanName: 'custom_operation', spanType: 'custom' })
                          .timestamp(timestamp)
                          .duration(100)
                          .success()
                      )
                  )
              )
          )
      );
  });

  return Readable.from(Array.from(data).flatMap((event) => event.serialize()));
}
