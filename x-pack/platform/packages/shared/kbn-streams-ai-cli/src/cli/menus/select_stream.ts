/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ora from 'ora';
import { Streams } from '@kbn/streams-schema';
import { promptList, withBackChoice, isBack } from '../prompt/prompt';
import type { StreamsService } from '../services/streams_service';
import { formatStreamLabel } from '../stream_labels';
import { clearTerminal } from '../ui/terminal';

export async function selectStream({
  streamsService,
  signal,
  statusLine,
  currentStreamName,
}: {
  streamsService: StreamsService;
  signal: AbortSignal;
  statusLine: string;
  currentStreamName?: string;
}): Promise<Streams.ingest.all.Definition | undefined> {
  const spinner = ora('Loading streams').start();

  try {
    const streams = await streamsService.listStreams(signal);
    spinner.succeed('Streams loaded');

    const ingestStreams = streams.filter(Streams.ingest.all.Definition.is);

    if (!ingestStreams.length) {
      throw new Error('No ingest streams are available.');
    }

    clearTerminal();
    const selection = await promptList<string>({
      message: `Select stream\n${statusLine}\nChoose a stream:`,
      choices: withBackChoice(
        ingestStreams.map((stream) => {
          const label = formatStreamLabel(stream);

          return {
            name: `${label}${stream.name === currentStreamName ? ' (current)' : ''}`,
            value: stream.name,
          };
        })
      ),
      loop: true,
      defaultValue: currentStreamName,
    });

    if (isBack(selection)) {
      return undefined;
    }

    return ingestStreams.find((stream) => stream.name === selection);
  } catch (error) {
    spinner.fail('Failed to load streams');
    throw error;
  }
}
