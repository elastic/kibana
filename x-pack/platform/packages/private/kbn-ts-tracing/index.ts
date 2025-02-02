/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client, errors } from '@elastic/elasticsearch';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { Command } from 'commander';
import { promises as Fs } from 'fs';
import Path from 'path';
import util from 'util';
import { bufferCount, from, mergeMap, of, switchMap, filter, toArray, concat } from 'rxjs';
import { format, parse } from 'url';
import { last, orderBy, chunk } from 'lodash';
import LRUCache from 'lru-cache';

enum TraceEventType {
  Begin = 'B',
  End = 'E',
  Complete = 'X',
  Instant = 'I',
  Counter = 'C',
  Metadata = 'M',
}

interface TraceMetric {
  event_name: string;
  event_phase: string;
  phase_root: boolean;
  file_root: boolean;
  fragment_root: boolean;
  ts: number;
  duration_us: number;
  config_file_path: string;
  root_dir: string;
  project_id: string;
  run_id: string;
  file_path?: string;
  start_pos?: number;
  end_pos?: number;
  code?: string;
}

interface TraceEvent {
  name: string;
  cat: string;
  ph: string;
  ts: number;
  pid: string;
  tid: string;
  dur?: number;
  args?: Record<string, any>;
}

interface TypeDefinition {
  id: string;
  symbolName?: string;
  firstDeclaration?: {
    path: string;
  };
  destructuringPattern?: {
    path: string;
  };
  referenceLocation?: {
    path: string;
  };
  display?: string;
}

interface CodeFragment {
  filename: string;
  start: number;
  end: number;
  metric: TraceMetric;
}

function replaceBaseDir<T extends string | undefined>(path?: T): T;
function replaceBaseDir(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }
  return path.replace(new RegExp(`${REPO_ROOT}`, 'i'), '').substring(1);
}
function cli() {
  const program = new Command('bin/kibana-setup');

  program
    .name('ts-tracing')
    .description(
      'ts-tracing parses TypeScript tracing files and indexes metrics into an ES cluster'
    )
    .requiredOption('-t, --traces <dir>', 'The directory containing the TypeScript trace files')
    .option(
      '-e, --elasticsearch <hosts>',
      'Elasticsearch host, including basic auth',
      'http://elastic:changeme@localhost:9200'
    )
    .option('-d, --debug', 'Debug logging', false)
    .option('-v, --verbose', 'Verbose logging', false)
    .option('-s, --silent', 'Prevent all logging', false)
    .action(async () => {
      const options = program.opts() as {
        traces: string;
        elasticsearch: string;
        silent: boolean;
        verbose: boolean;
        debug: boolean;
        index: string;
      };

      const { auth, ...rest } = parse(options.elasticsearch);

      const esHost = format(rest);

      const log = new ToolingLog({
        level: options.silent
          ? 'silent'
          : options.debug
          ? 'debug'
          : options.verbose
          ? 'verbose'
          : 'info',
        writeTo: process.stdout,
      });

      const esClient = new Client({
        node: options.elasticsearch,
      });

      const timestamp = new Date().toISOString();

      const tracesDir = Path.isAbsolute(options.traces)
        ? options.traces
        : Path.join(REPO_ROOT, options.traces);

      log.debug(`elasticsearch=${esHost}, traces=${tracesDir}, auth=${auth}`);

      log.info(`Processing files in ${tracesDir}`);

      const dirStats = await Fs.stat(tracesDir);

      if (!dirStats.isDirectory()) {
        throw new Error(`Dir ${tracesDir} exists, but is not a directory`);
      }

      const files = await Fs.readdir(tracesDir);

      await esClient.indices
        .putIndexTemplate({
          allow_auto_create: true,
          name: `metrics-kibana_tsc`,
          data_stream: {},
          index_patterns: ['metrics-kibana_tsc-*'],
          template: {
            mappings: {
              dynamic: 'strict',
              properties: {
                '@timestamp': {
                  type: 'date',
                },
                config_file_path: {
                  type: 'keyword',
                },
                root_dir: {
                  type: 'keyword',
                },
                run_id: {
                  type: 'keyword',
                },
                project_id: {
                  type: 'keyword',
                },
                event_name: {
                  type: 'keyword',
                },
                event_phase: {
                  type: 'keyword',
                },
                phase_root: {
                  type: 'boolean',
                },
                fragment_root: {
                  type: 'boolean',
                },
                duration_us: {
                  type: 'long',
                },
                file_path: {
                  type: 'keyword',
                },
                file_root: {
                  type: 'boolean',
                },
                start_pos: {
                  type: 'byte',
                },
                end_pos: {
                  type: 'byte',
                },
                code: {
                  type: 'text',
                },
                'data_stream.dataset': {
                  type: 'constant_keyword',
                },
                'data_stream.type': {
                  type: 'constant_keyword',
                },
                'data_stream.namespace': {
                  type: 'constant_keyword',
                },
              },
            },
            settings: {
              auto_expand_replicas: '0-1',
            },
          },
        })
        .catch((error) => {
          if (error instanceof errors.ResponseError && error.statusCode === 409) {
            return;
          }
          throw error;
        });

      const namespace = 'development';

      const indexName = `metrics-kibana_tsc-${namespace}`;

      const traceFiles: Array<{
        runId: string;
        projectId: string;
        file: string;
      }> = [];

      files.forEach((file) => {
        if (Path.extname(file) !== '.json') {
          return;
        }

        if (file.startsWith('trace.')) {
          // parse trace.92841-652.json
          const [_prefix, id, _ext] = file.split('.');
          const [runId, projectId] = id.split('-');
          if (!runId || !projectId) {
            return;
          }
          traceFiles.push({
            runId,
            projectId,
            file: Path.join(tracesDir, file),
          });
        }
      });

      if (!traceFiles.length) {
        throw new Error(`No trace files found in directory`);
      }

      log.info(`Processing ${traceFiles.length} traces`);

      const fileCache = new LRUCache({
        max: 10_000,
      });

      async function getFileContents(file: string): Promise<string> {
        let cachedFile = fileCache.get(file);
        if (!cachedFile) {
          cachedFile = await Fs.readFile(file, { encoding: 'utf8' }).catch((error) => {
            if (error.name === 'ENOENT') {
              log.debug(`Could not read file ${file}`);
              return '';
            }
            throw error;
          });
          fileCache.set(file, cachedFile);
        }

        return cachedFile as string;
      }

      from(traceFiles)
        .pipe(
          mergeMap(({ runId, file, projectId }) => {
            log.debug(`Parsing file ${file}`);
            return from(
              Promise.all([
                Fs.readFile(file, {
                  encoding: 'utf8',
                  // see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU
                })
                  .then((contents) => JSON.parse(contents) as TraceEvent[])
                  .catch((error) => {
                    log.debug(`Error parsing trace: ${error.message}`);
                    return undefined;
                  }),
                Promise.resolve<TypeDefinition[]>([]),
                // Fs.readFile(Path.join(tracesDir, `types.${runId}-${projectId}.json`), {
                //   encoding: 'utf8',
                // })
                //   .catch((error) => {
                //     if (error.code === 'ENOENT') {
                //       return JSON.stringify([]);
                //     }
                //     throw error;
                //   })
                //   .then((contents) => {
                //     return JSON.parse(contents) as TypeDefinition[];
                //   }),
              ])
            ).pipe(
              filter((results): results is [TraceEvent[], TypeDefinition[]] => !!results[0]),
              switchMap(([traceEvents, types]) => {
                const typesById: Map<string, TypeDefinition> = new Map();

                const fragmentsByFilename: Map<string, CodeFragment[]> = new Map();

                types.forEach((type) => {
                  typesById.set(type.id, type);
                });

                const createProgramEvent = traceEvents.find(
                  (event) => event.name === 'createProgram'
                );

                if (!createProgramEvent) {
                  throw new Error(
                    `Could not find createProgram event, needed to get the config file path`
                  );
                }

                const configFilePath = replaceBaseDir(
                  createProgramEvent.args!.configFilePath! as string
                );
                const rootDir = replaceBaseDir(createProgramEvent.args!.rootDir as string);

                traceEvents.unshift({
                  cat: 'root',
                  name: 'root',
                  ph: TraceEventType.Begin,
                  pid: createProgramEvent.pid,
                  tid: createProgramEvent.tid,
                  ts: createProgramEvent.ts,
                });

                const stack: TraceMetric[] = [];

                const metrics: TraceMetric[] = [];

                traceEvents.push({
                  cat: 'root',
                  name: 'root',
                  ph: TraceEventType.End,
                  pid: createProgramEvent.pid,
                  tid: createProgramEvent.tid,
                  ts: traceEvents[traceEvents.length - 1].ts,
                });

                traceEvents.forEach((traceEvent) => {
                  const eventType = traceEvent.ph.toUpperCase();

                  const parent = last(stack);

                  const filePath: string | undefined =
                    replaceBaseDir(
                      traceEvent.args?.path ??
                        traceEvent.args?.fileName ??
                        traceEvent.args?.containingFileName
                    ) ?? parent?.file_path;

                  const start = traceEvent.args?.pos as number | undefined;
                  const end = traceEvent.args?.end as number | undefined;

                  let fragment: CodeFragment | undefined;

                  const fileRoot = Boolean(filePath && filePath !== parent?.file_path);

                  const base: TraceMetric = {
                    config_file_path: configFilePath,
                    root_dir: rootDir,
                    run_id: runId,
                    project_id: projectId,
                    event_name: traceEvent.name,
                    event_phase: traceEvent.cat,
                    ts: traceEvent.ts,
                    duration_us: Math.round(traceEvent.dur ?? 0),
                    file_path: filePath,
                    file_root: fileRoot,
                    phase_root: !parent || parent.event_phase !== traceEvent.cat,
                    start_pos: traceEvent.args?.pos,
                    end_pos: traceEvent.args?.end,
                    fragment_root: false,
                  };

                  if (start !== undefined && end !== undefined && filePath) {
                    fragment = {
                      start,
                      end,
                      filename: filePath,
                      metric: base,
                    };

                    let fragmentsForFile = fragmentsByFilename.get(filePath);
                    if (!fragmentsForFile) {
                      fragmentsForFile = [];
                      fragmentsByFilename.set(filePath, fragmentsForFile);
                    }

                    fragmentsForFile.push(fragment);
                  }

                  if (eventType === TraceEventType.Complete) {
                    metrics.push(base);
                    return;
                  }

                  if (eventType === TraceEventType.Begin) {
                    metrics.push(base);
                    stack.push(base);
                    return;
                  }

                  if (eventType === TraceEventType.End) {
                    const lastEvent = stack.pop();
                    if (!lastEvent) {
                      throw new Error(`Couldn't find start event for end`);
                    }
                    lastEvent.duration_us = Math.round(base.ts + base.duration_us - lastEvent.ts);
                    return;
                  }

                  if (
                    eventType === TraceEventType.Instant ||
                    eventType === TraceEventType.Metadata
                  ) {
                    return;
                  }

                  throw new Error('Unrecognized event type: ' + eventType);
                });

                Array.from(fragmentsByFilename).forEach(([fileName, fragments]) => {
                  let rootFragment: CodeFragment | undefined;
                  const sorted = orderBy(fragments, (fragment) => fragment.start, 'asc');
                  sorted.forEach((fragment, index) => {
                    const isRoot = rootFragment ? rootFragment.end < fragment.start : true;

                    fragment.metric.fragment_root = isRoot;
                    if (isRoot) {
                      rootFragment = fragment;
                    }
                  });
                });
                return of(metrics);
              })
            );
          }, 50),
          toArray(),
          switchMap((allMetricChunks) => {
            const metrics = orderBy(allMetricChunks.flat(), (metric) => metric.file_path, 'desc');
            return concat(...chunk(metrics, 10_000).map((items) => of(...items)));
          }),
          mergeMap(async (metric) => {
            const { start_pos: start, end_pos: end, file_path: filePath } = metric;
            if (start !== undefined && end !== undefined && filePath !== undefined) {
              const contents = await getFileContents(Path.join(REPO_ROOT, filePath)).then(
                (fileContents) => fileContents.substring(start, end)
              );
              metric.code = contents;
              return metric;
            }
            return metric;
          }, 50),
          bufferCount(500),
          switchMap((metrics) => {
            return esClient
              .bulk({
                index: indexName,
                operations: metrics.flatMap(({ ts, ...metric }) => {
                  return [
                    {
                      create: {},
                    },
                    {
                      ...metric,
                      '@timestamp': timestamp,
                      data_stream: {
                        namespace,
                        type: 'metrics',
                        dataset: 'kibana_tsc',
                      },
                    },
                  ];
                }),
              })
              .then((response) => {
                if (response.errors) {
                  log.warning(`Encountered some errors during bulk ingestion`);
                  log.debug(
                    JSON.stringify(
                      response.items.filter((item) => item.create && item.create.error).slice(0, 5)
                    )
                  );
                }
                return response;
              });
          })
        )
        .subscribe({
          error: (error) => {
            if (error instanceof errors.ResponseError) {
              log.error(util.inspect(error, { depth: 5 }));
            } else {
              log.error(error);
            }
            process.exit(1);
          },
          complete: () => {
            process.exit(0);
          },
        });
    })
    .parse(process.argv);
}

export { cli };
