/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import { OpenAIClient } from './create_openai_client';
import { type LoghubSystem } from './read_loghub_system_files';
import { getParserFilename, writeFileRecursively } from './utils';
import { validateParser } from './validate_parser';

async function generateParser({
  openAIClient,
  system,
  error,
  log,
}: {
  openAIClient: OpenAIClient;
  system: LoghubSystem;
  error?: Error;
  log: ToolingLog;
}): Promise<string> {
  log.info(`Attempting to generate a parser for ${system.name}`);

  const systemPrompt = `You are given a system's documentation and log files.
      
      Your goal is to write a TypeScript files that exports three functions:
      
      - \`getTimestamp ( logLine:string ):number\`: extract the timestamp
      from the logline and return it as epoch milliseconds
      - \`replaceTimestamp ( logLine:string, timestamp:number ):string\`:
      replace the timestamp with the new timestamp, in the format that is
      used in the log line.
      - \`getFakeMetadata ( logLine:string ):object\`: invent fake resource metadata that
      is not in the log line, but is useful for the system. It's up to you what
      to put in there, but it should be realistic, for example, it could be a host name,
      a user name, a process name, kubernetes metadata, etc. The metadata should
      be a JSON object and use ECS field name where possible (e.g. host.name, etc.). Add some randomness
      to the metadata, so that it is not always exactly the same (e.g. use a random
      number for the process id, a random host name, etc.). Make sure the metadata
      makes sense for the system and the log line (especially for the system)
      
      Generally, you will want to generate
      a regular expression that can be used to A) extract the values
      to parse the date, B) replace the original timestamp with the
      formatted injected timestamp.

      You can use \`moment\`, but not any other libraries.

      Some notes:
      - in some cases, leading 0s are stripped. Take this into account
      when generating a regex (e.g. use \d{2,3} instead of \d{2}).
            `;

  const reasoningResponse = await openAIClient.chat.completions.create({
    model: openAIClient.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Analyze the log lines and reason about the date format
            in the log lines. Find the piece of data that is likely the
            timestamp. Reason about regular expressions, timezones, date
            formatting/parsing from the format in the log line to and from
            epoch ms. You don't have to write the actual code yet, that
            happens in a follow-up, but you can write snippets. If an error
            occurred, reason about how the error should be fixed.

            ${
              error
                ? `# Error
            The following error occurred on a previous attempt: ${error.message}`
                : ''
            }
            
            ## README.md

            ${system.readme ?? 'Empty'}

            ## Log file

            ${system.logLines.slice(0, 500).join('\n')}
            `,
      },
    ],
    temperature: 0.2,
  });

  const analysis = reasoningResponse.choices[0].message.content;

  const output = await openAIClient.chat.completions.create({
    model: openAIClient.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Based on previous reasoning, output the
            typescript file in the following format. Make sure
            any dates are parsed as UTC if the time zone is not
            specified, regardless of where the script runs:

            export function getTimestamp ( logLine:string ):number {
              // function implementation here
            }

            export function replaceTimestamp ( logLine:string, timestamp:number ) {
              // function implementation here
            }

            DO NOT output anything else, including any markdown backticks,
            just the file contents. The result of your output will be written
            to disk directly. If you use \`moment\`, add the following import
            statement to the top of the file:

            \`\`\`import moment from "moment";\`\`\`

            If you use a regex that is shared, add it to the top of the file
            as a constant.

            # Reasoning
            
            ${analysis}
            
            ## README.md

            ${system.readme ?? 'Empty'}

            ## Log file

            ${system.logLines.slice(0, 500).join('\n')}
            `,
      },
    ],
    temperature: 0.2,
  });

  const file = output.choices[0].message.content;

  if (!file) {
    throw new Error(`No content received from the LLM`);
  }

  return file;
}

export async function ensureValidParser({
  openAIClient,
  system,
  log,
}: {
  openAIClient: OpenAIClient;
  system: LoghubSystem;
  log: ToolingLog;
}) {
  let error: Error | undefined;

  const isValid = await validateParser(system)
    .then(() => true)
    .catch(() => false);

  if (isValid) {
    return;
  }

  await pRetry(
    async () => {
      const file = await generateParser({ system, error, log, openAIClient });

      await writeFileRecursively(getParserFilename(system), file);

      await validateParser(system);
    },
    { retries: 5 }
  );
}
