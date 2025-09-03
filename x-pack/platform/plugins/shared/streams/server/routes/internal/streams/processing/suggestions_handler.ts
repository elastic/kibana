/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import {
  InferenceClient,
  MessageRole,
  type FromToolSchema,
  type Message,
  type OutputOptions,
} from '@kbn/inference-common';
import { FlattenRecord, Streams } from '@kbn/streams-schema';
import { cloneDeep, get } from 'lodash';
import { StreamsClient } from '../../../../lib/streams/client';
import { convertEcsFieldsToOtel } from './convert_ecs_fields_to_otel';
import { getLogGroups, getVariedSamples, sortByProbability } from './get_log_groups';
import { ProcessingSuggestionBody } from './route';
import { simulateProcessing, type SimulationDocReport } from './simulation_handler';

export interface SimulationWithPattern extends Awaited<ReturnType<typeof simulateProcessing>> {
  pattern: string;
}

export const handleProcessingSuggestion = async (
  streamName: string,
  body: ProcessingSuggestionBody,
  inferenceClient: InferenceClient,
  scopedClusterClient: IScopedClusterClient,
  streamsClient: StreamsClient
) => {
  const { field, samples } = body;
  const groups = getLogMessageGroups(samples, field).slice(0, 1);
  const stream = await streamsClient.getStream(streamName);
  const isWiredStream = Streams.WiredStream.Definition.is(stream);
  return await Promise.all(
    groups.map((exampleValues) =>
      processPattern(
        exampleValues,
        streamName,
        isWiredStream,
        body,
        inferenceClient,
        scopedClusterClient,
        streamsClient,
        field,
        samples
      )
    )
  );
};

async function processPattern(
  exampleValues: string[],
  streamName: string,
  isWiredStream: boolean,
  body: ProcessingSuggestionBody,
  inferenceClient: InferenceClient,
  scopedClusterClient: IScopedClusterClient,
  streamsClient: StreamsClient,
  field: string,
  sampleDocuments: FlattenRecord[]
) {
  const systemPrompt = `
You are a specialized assistant for parsing log lines in Elasticsearch using Grok processors.

You are provided with a context block that defines built-in Grok pattern definitions. Use these definitions when constructing Grok patterns.

<context>
<built_in_grok_patterns>
USERNAME [a-zA-Z0-9._-]+
USER %{USERNAME}
EMAILLOCALPART [a-zA-Z0-9!#$%&'*+\-/=?^_\`{|}~]{1,64}(?:\.[a-zA-Z0-9!#$%&'*+\-/=?^_\`{|}~]{1,62}){0,63}
EMAILADDRESS %{EMAILLOCALPART}@%{HOSTNAME}
INT (?:[+-]?(?:[0-9]+))
BASE10NUM (?<![0-9.+-])(?>[+-]?(?:(?:[0-9]+(?:\.[0-9]+)?)|(?:\.[0-9]+)))
NUMBER (?:%{BASE10NUM})
BASE16NUM (?<![0-9A-Fa-f])(?:[+-]?(?:0x)?(?:[0-9A-Fa-f]+))
BASE16FLOAT \b(?<![0-9A-Fa-f.])(?:[+-]?(?:0x)?(?:(?:[0-9A-Fa-f]+(?:\.[0-9A-Fa-f]*)?)|(?:\.[0-9A-Fa-f]+)))\b
POSINT \b(?:[1-9][0-9]*)\b
NONNEGINT \b(?:[0-9]+)\b
WORD \b\w+\b
NOTSPACE \S+
SPACE \s*
DATA .*?
GREEDYDATA .*
QUOTEDSTRING (?>(?<!\\)(?>"(?>\\.|[^\\"]+)+"|""|(?>'(?>\\.|[^\\']+)+')|''|(?>\`(?>\\.|[^\\\`]+)+\`)|\`\`))
UUID [A-Fa-f0-9]{8}-(?:[A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}
URN urn:[0-9A-Za-z][0-9A-Za-z-]{0,31}:(?:%[0-9a-fA-F]{2}|[0-9A-Za-z()+,.:=@;$_!*'/?#-])+
MAC (?:%{CISCOMAC}|%{WINDOWSMAC}|%{COMMONMAC})
CISCOMAC (?:(?:[A-Fa-f0-9]{4}\.){2}[A-Fa-f0-9]{4})
WINDOWSMAC (?:(?:[A-Fa-f0-9]{2}-){5}[A-Fa-f0-9]{2})
COMMONMAC (?:(?:[A-Fa-f0-9]{2}:){5}[A-Fa-f0-9]{2})
IPV6 ((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?
IPV4 (?<![0-9])(?:(?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])[.](?:[0-1]?[0-9]{1,2}|2[0-4][0-9]|25[0-5]))(?![0-9])
IP (?:%{IPV6}|%{IPV4})
HOSTNAME \b(?:[0-9A-Za-z][0-9A-Za-z-]{0,62})(?:\.(?:[0-9A-Za-z][0-9A-Za-z-]{0,62}))*(\.?|\b)
IPORHOST (?:%{IP}|%{HOSTNAME})
HOSTPORT %{IPORHOST}:%{POSINT}
PATH (?:%{UNIXPATH}|%{WINPATH})
UNIXPATH (/[[[:alnum:]]_%!$@:.,+~-]*)+
TTY (?:/dev/(pts|tty([pq])?)(\w+)?/?(?:[0-9]+))
WINPATH (?>[A-Za-z]+:|\\)(?:\\[^\\?*]*)+
URIPROTO [A-Za-z]([A-Za-z0-9+\-.]+)+
URIHOST %{IPORHOST}(?::%{POSINT})?
URIPATH (?:/[A-Za-z0-9$.+!*'(){},~:;=@#%&_\-]*)+
URIQUERY [A-Za-z0-9$.+!*'|(){},~@#%&/=:;_?\-\[\]<>]*
URIPARAM \?%{URIQUERY}
URIPATHPARAM %{URIPATH}(?:\?%{URIQUERY})?
URI %{URIPROTO}://(?:%{USER}(?::[^@]*)?@)?(?:%{URIHOST})?(?:%{URIPATH}(?:\?%{URIQUERY})?)?
MONTH \b(?:[Jj]an(?:uary|uar)?|[Ff]eb(?:ruary|ruar)?|[Mm](?:a|ä)?r(?:ch|z)?|[Aa]pr(?:il)?|[Mm]a(?:y|i)?|[Jj]un(?:e|i)?|[Jj]ul(?:y|i)?|[Aa]ug(?:ust)?|[Ss]ep(?:tember)?|[Oo](?:c|k)?t(?:ober)?|[Nn]ov(?:ember)?|[Dd]e(?:c|z)(?:ember)?)\b
MONTHNUM (?:0?[1-9]|1[0-2])
MONTHNUM2 (?:0[1-9]|1[0-2])
MONTHDAY (?:(?:0[1-9])|(?:[12][0-9])|(?:3[01])|[1-9])
DAY (?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)
YEAR (?>\d\d){1,2}
HOUR (?:2[0123]|[01]?[0-9])
MINUTE (?:[0-5][0-9])
SECOND (?:(?:[0-5]?[0-9]|60)(?:[:.,][0-9]+)?)
TIME (?!<[0-9])%{HOUR}:%{MINUTE}(?::%{SECOND})(?![0-9])
DATE_US %{MONTHNUM}[/-]%{MONTHDAY}[/-]%{YEAR}
DATE_EU %{MONTHDAY}[./-]%{MONTHNUM}[./-]%{YEAR}
ISO8601_TIMEZONE (?:Z|[+-]%{HOUR}(?::?%{MINUTE}))
ISO8601_SECOND %{SECOND}
TIMESTAMP_ISO8601 %{YEAR}-%{MONTHNUM}-%{MONTHDAY}[T ]%{HOUR}:?%{MINUTE}(?::?%{SECOND})?%{ISO8601_TIMEZONE}?
DATE %{DATE_US}|%{DATE_EU}
DATESTAMP %{DATE}[- ]%{TIME}
TZ (?:[APMCE][SD]T|UTC)
DATESTAMP_RFC822 %{DAY} %{MONTH} %{MONTHDAY} %{YEAR} %{TIME} %{TZ}
DATESTAMP_RFC2822 %{DAY}, %{MONTHDAY} %{MONTH} %{YEAR} %{TIME} %{ISO8601_TIMEZONE}
DATESTAMP_OTHER %{DAY} %{MONTH} %{MONTHDAY} %{TIME} %{TZ} %{YEAR}
DATESTAMP_EVENTLOG %{YEAR}%{MONTHNUM2}%{MONTHDAY}%{HOUR}%{MINUTE}%{SECOND}
SYSLOGTIMESTAMP %{MONTH} +%{MONTHDAY} %{TIME}
PROG [\x21-\x5a\x5c\x5e-\x7e]+
SYSLOGPROG %{PROG:process.name}(?:\[%{POSINT:process.pid:int}\])?
SYSLOGHOST %{IPORHOST}
SYSLOGFACILITY <%{NONNEGINT:log.syslog.facility.code:int}.%{NONNEGINT:log.syslog.priority:int}>
HTTPDATE %{MONTHDAY}/%{MONTH}/%{YEAR}:%{TIME} %{INT}
QS %{QUOTEDSTRING}
SYSLOGBASE %{SYSLOGTIMESTAMP:timestamp} (?:%{SYSLOGFACILITY} )?%{SYSLOGHOST:host.hostname} %{SYSLOGPROG}:
LOGLEVEL ([Aa]lert|ALERT|[Tt]race|TRACE|[Dd]ebug|DEBUG|[Nn]otice|NOTICE|[Ii]nfo?(?:rmation)?|INFO?(?:RMATION)?|[Ww]arn?(?:ing)?|WARN?(?:ING)?|[Ee]rr?(?:or)?|ERR?(?:OR)?|[Cc]rit?(?:ical)?|CRIT?(?:ICAL)?|[Ff]atal|FATAL|[Ss]evere|SEVERE|EMERG(?:ENCY)?|[Ee]merg(?:ency)?)
</built_in_grok_patterns>
</context>
`;
  const taskPrompt = `
# Task

- I will provide you with sample logs from a single data source whose structure is **not known in advance**.  
- You must figure out the structure and produce a final JSON pipeline with a Grok processor (and optionally a date processor if needed) that extracts the relevant fields into ECS-compatible field names.  
- Follow these steps carefully:

---

## Step 1: Analyze the Sample Logs

1. Identify and describe the structure of each log line (for example, how the timestamp, log level, message, etc. are arranged).  
2. Determine if the timestamp is in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format, or if it matches one of Elasticsearch's built-in Grok timestamp patterns, such as \`TIMESTAMP_ISO8601\`, \`SYSLOGTIMESTAMP\`, etc.  
3. If the timestamp does **not** match a single built-in pattern that fully captures the date/time **and** year, you must define a new custom pattern named \`CUSTOM_TIMESTAMP\` (for example, \`"%{DAY} %{MONTH} %{MONTHDAY} %{TIME} %{YEAR}"\`).  
4. If the logs suggest an optional component might be present in some lines but absent in others), ensure you handle that via optional non-capturing groups (e.g. \`(?: ... )?\`).

---

## Step 2: Create the Grok Processor

1. **If the timestamp is valid ISO 8601, then capture it directly into \`@timestamp\`.  
2. **Otherwise**, store the entire timestamp in a field named \`custom_timestamp\` (or similar) and use a date processor to convert it to \`@timestamp\`.  
3. **Important**: If you define a pattern named \`CUSTOM_TIMESTAMP\`, you **must** actually use it in the final Grok expression. Do **not** define separate captures for day, month, year, etc. if you choose the custom approach.  
4. Capture relevant fields into [ECS-compatible keys](https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html) when possible (e.g. \`log.level\`, \`client.ip\`, \`process.name\`, \`message\`, etc.).  
5. If there are optional fields in the logs, handle them using optional groups: \`(?: ... )?\`.  
6. Use \`\\s+\` for 2+ spaces if needed; otherwise rely on direct match patterns.
7. Use \`NONNEGINT\` instead of \`POSINT\` to match positive integers starting with 0.
8. Use \`GREEDYDATA\` instead of \`DATA\` to match the log message.

---

## Step 3: Provide the Final Pipeline in JSON

1. Name the pipeline after the detected log source (e.g. "Extract fields from Apache logs", "Extract fields from System logs", etc).
2. Return the pipeline in valid **JSON** format, typically with the structure:

\`\`\`json
{
  "description": "Your pipeline name here",
  "processors": [
    {
      "grok": {
        "field": "${field}",
        "patterns": ["Your Grok pattern here"],
        "pattern_definitions": {
          "CUSTOM_TIMESTAMP": "..."
        }
      }
    },
    {
      "date": {
        "field": "custom_timestamp",
        "formats": [
          "EEE MMM dd HH:mm:ss yyyy"
        ],
        "target_field": "@timestamp"
      }
    }
  ]
}
\`\`\`
*(Only include the \`date\` processor if you decided it was necessary based on the logs.)*

---

## Sample Logs

<sample_logs>
${exampleValues.join('\n')}
</sample_logs>

**Important**:

- If you define a custom timestamp pattern, you must use it in your final Grok expression (e.g. \`\\[%{CUSTOM_TIMESTAMP:custom_timestamp}\\]\`).  
- Do not define separate day, month, or year captures if you claim you are using a custom pattern.  
  `;

  const firstPass = await suggestAndValidateGrokProcessor({
    streamName,
    isWiredStream,
    streamsClient,
    scopedClusterClient,
    inferenceClient,
    connectorId: body.connectorId,
    system: systemPrompt,
    input: taskPrompt,
    sampleDocuments,
  });

  const errors = getProcessingErrors(firstPass.simulationResult.documents);
  if (errors.length === 0) {
    return {
      description: firstPass.output.description,
      grokProcessor: firstPass.grokProcessor,
      simulationResult: firstPass.simulationResult,
    };
  }

  const sampleErrors = getErrorMessageGroups(errors);

  const secondPass = await suggestAndValidateGrokProcessor({
    streamName,
    isWiredStream,
    streamsClient,
    scopedClusterClient,
    inferenceClient,
    connectorId: body.connectorId,
    system: systemPrompt,
    previousMessages: firstPass.messages,
    input: `
  The provided Grok processor returned the following errors when processing the sample logs:

  ${sampleErrors.map((message) => `- ${message}`).join('\n')}

  Adjust the Grok processor to handle these cases correctly.
  `,
    sampleDocuments,
  });

  if (
    secondPass.simulationResult.documents_metrics.failed_rate <
    firstPass.simulationResult.documents_metrics.failed_rate
  ) {
    return {
      description: secondPass.output.description,
      grokProcessor: secondPass.grokProcessor,
      simulationResult: secondPass.simulationResult,
    };
  }

  return {
    description: firstPass.output.description,
    grokProcessor: firstPass.grokProcessor,
    simulationResult: firstPass.simulationResult,
  };
}

const ingestPipelineSchema = {
  type: 'object',
  required: ['description', 'processors'],
  properties: {
    description: { type: 'string' },
    processors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          grok: {
            type: 'object',
            required: ['field', 'patterns'],
            properties: {
              field: { type: 'string' },
              patterns: { type: 'array', items: { type: 'string' } },
              pattern_definitions: {
                type: 'object',
                properties: {},
              },
              ignore_missing: { type: 'boolean' },
              ignore_failure: { type: 'boolean' },
            },
          },
          date: {
            type: 'object',
            properties: {},
          },
        },
      },
    },
  },
} as const;

type Mutable<T> = {
  -readonly [P in keyof T]: Mutable<T[P]>;
};
type IngestPipeline = FromToolSchema<typeof ingestPipelineSchema>;
type UnknownProcessor = IngestPipeline['processors'][number];
type GrokProcessor = Pick<Required<UnknownProcessor>, 'grok'>;

function isGrokProcessor(processor: UnknownProcessor): processor is GrokProcessor {
  return 'grok' in processor;
}

export function getLogMessageGroups(sampleDocuments: FlattenRecord[], fieldName: string) {
  const messages = sampleDocuments.reduce<string[]>((acc, sample) => {
    const value = get(sample, fieldName);
    if (typeof value === 'string') {
      acc.push(value);
    }
    return acc;
  }, []);

  const groups = getLogGroups(messages, 2);
  sortByProbability(groups);
  return groups.map((group) => getVariedSamples(group, 10));
}

function getProcessingErrors(documents: SimulationDocReport[]) {
  return documents.flatMap((doc) => doc.errors.map((error) => error.message));
}

function getErrorMessageGroups(errors: string[]) {
  const groups = getLogGroups(errors, 1);
  sortByProbability(groups);
  return getVariedSamples(
    {
      pattern: '',
      probability: 1,
      logs: [],
      children: groups,
    },
    5
  );
}

interface SuggestAndValidateGrokProcessorParams
  extends Pick<OutputOptions, 'connectorId' | 'system' | 'previousMessages' | 'input'> {
  streamName: string;
  isWiredStream: boolean;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  sampleDocuments: FlattenRecord[];
}

const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

async function suggestAndValidateGrokProcessor({
  streamName,
  isWiredStream,
  streamsClient,
  scopedClusterClient,
  inferenceClient,
  connectorId,
  system,
  previousMessages = [],
  input,
  sampleDocuments,
}: SuggestAndValidateGrokProcessorParams) {
  const chatResponse = await inferenceClient.output({
    id: 'create_grok_processor',
    connectorId,
    system,
    previousMessages,
    input,
    schema: ingestPipelineSchema,
  });

  const grokProcessorWithEcsFields = chatResponse.output.processors.find(isGrokProcessor);
  if (!grokProcessorWithEcsFields) {
    throw new Error(
      `Missing Grok processor in '${chatResponse.id}' response by '${connectorId}' connector`
    );
  }

  // Convert fields to OpenTelemetry semantic convention
  const grokProcessor: Mutable<GrokProcessor> = isWiredStream
    ? cloneDeep(grokProcessorWithEcsFields)
    : grokProcessorWithEcsFields;
  if (isWiredStream) {
    grokProcessor.grok.patterns = grokProcessor.grok.patterns.map((pattern) =>
      convertEcsFieldsToOtel(pattern)
    );
  }

  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        processing: [
          {
            id: SUGGESTED_GROK_PROCESSOR_ID,
            grok: grokProcessor.grok,
          },
        ],
        documents: sampleDocuments,
      },
    },
    scopedClusterClient,
    streamsClient,
  });

  return {
    messages: [
      ...previousMessages,
      {
        role: MessageRole.User,
        content: input,
      },
      {
        role: MessageRole.Assistant,
        content: `
\`\`\`json
${JSON.stringify(
  {
    description: chatResponse.output.description,
    processors: [grokProcessorWithEcsFields],
  },
  null,
  2
)}
\`\`\`
        `,
      },
    ] as Message[],
    output: chatResponse.output,
    grokProcessor: grokProcessor.grok,
    simulationResult,
  };
}
