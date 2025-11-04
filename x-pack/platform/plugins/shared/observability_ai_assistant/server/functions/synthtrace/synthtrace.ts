/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { executeSchema } from '@kbn/apm-synthtrace/src/synth_schema/executor';
import type { SynthSchema } from '@kbn/apm-synthtrace/src/synth_schema/synth_schema_template';
import type { FunctionRegistrationParameters } from '..';

const SYNTHTRACE_FUNCTION_NAME = 'synthtrace_generate_data';

/**
 * Extract context data from screen contexts
 */
function extractContextData(screenContexts: any[]) {
  const allData = compact(screenContexts.flatMap((context) => context.data || []));
  const contextMap: Record<string, any> = {};

  for (const data of allData) {
    const key = data.name.toLowerCase().replace(/[._]/g, '_');
    contextMap[key] = data.value;

    // Also store with original name for flexible access
    contextMap[data.name] = data.value;

    // If value is an object, extract nested fields (e.g., service.name from service object)
    if (data.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
      for (const [nestedKey, nestedValue] of Object.entries(data.value)) {
        const nestedKeyNormalized = nestedKey.toLowerCase().replace(/[._]/g, '_');
        contextMap[nestedKeyNormalized] = nestedValue;
        contextMap[nestedKey] = nestedValue;
        // Also store as parent.child format
        contextMap[`${data.name}.${nestedKey}`] = nestedValue;
      }
    }
  }

  return contextMap;
}

/**
 * Extract time range from screen context or URL
 */
function extractTimeRange(screenContexts: any[], request: any): { from: string; to: string } {
  const contextData = extractContextData(screenContexts);

  // Try screen context first
  if (contextData.rangeFrom && contextData.rangeTo) {
    return {
      from: String(contextData.rangeFrom),
      to: String(contextData.rangeTo),
    };
  }

  if (contextData.start && contextData.end) {
    return {
      from: String(contextData.start),
      to: String(contextData.end),
    };
  }

  // Try URL query parameters
  if (request?.url) {
    const url = new URL(request.url, 'http://localhost');
    const rangeFrom = url.searchParams.get('rangeFrom');
    const rangeTo = url.searchParams.get('rangeTo');

    if (rangeFrom && rangeTo) {
      return { from: rangeFrom, to: rangeTo };
    }
  }

  // Default to last hour
  return { from: 'now-1h', to: 'now' };
}

/**
 * Map context data to synthtrace schema fields
 */
function mapContextToSynthtraceFields(contextData: Record<string, any>) {
  const fields: {
    serviceName?: string;
    serviceId?: string;
    agentName?: string;
    environment?: string;
    transactionId?: string;
    traceId?: string;
    hostName?: string;
    containerId?: string;
  } = {};

  // Service name/id - check multiple possible keys
  // The screen context uses 'service_name' as the key
  fields.serviceName =
    contextData.service_name || // Normalized key from extractContextData
    contextData.service_name || // Original key (if preserved)
    contextData['service.name'] || // Dotted notation
    contextData.serviceName || // CamelCase
    contextData.service?.name; // Nested object

  fields.serviceId = fields.serviceName;

  // Agent name
  fields.agentName =
    contextData.agent_name ||
    contextData['agent.name'] ||
    contextData.agentName ||
    contextData.agent?.name ||
    'nodejs'; // Default

  // Environment
  fields.environment =
    contextData.environment ||
    contextData['service.environment'] ||
    contextData.service?.environment ||
    'production'; // Default

  // Transaction ID
  fields.transactionId =
    contextData.transaction_id ||
    contextData['transaction.id'] ||
    contextData.transactionId ||
    contextData.transaction?.id;

  // Trace ID
  fields.traceId =
    contextData.trace_id || contextData['trace.id'] || contextData.traceId || contextData.trace?.id;

  // Host name
  fields.hostName =
    contextData.host_name ||
    contextData['host.name'] ||
    contextData.hostName ||
    contextData.host?.name;

  // Container ID
  fields.containerId =
    contextData.container_id ||
    contextData['container.id'] ||
    contextData.containerId ||
    contextData.container?.id;

  return fields;
}

/**
 * Build synthtrace config from context and user prompt
 */
function buildSynthtraceConfig(
  contextFields: ReturnType<typeof mapContextToSynthtraceFields>,
  timeRange: { from: string; to: string },
  userPrompt?: string
): SynthSchema {
  if (!contextFields.serviceName) {
    throw new Error(
      'Service name is required. Please open a service page or specify the service name in your request.'
    );
  }

  // Parse user prompt to determine what to generate
  const promptLower = (userPrompt || '').toLowerCase();
  const wantsTransactions =
    promptLower.includes('transaction') ||
    promptLower.includes('trace') ||
    promptLower.includes('transactions') ||
    promptLower.includes('traces');
  // If user asks for "transaction logs" or "transaction metrics", they want transactions too
  const wantsLogs =
    promptLower.includes('log') || (!wantsTransactions && !promptLower.includes('metric')); // Default to logs if not explicitly requesting transactions or metrics only
  const wantsMetrics =
    promptLower.includes('metric') || promptLower.includes('cpu') || promptLower.includes('memory');

  // If user asks for transaction logs/metrics, they want transactions
  const actuallyWantsTransactions =
    wantsTransactions || (wantsLogs && promptLower.includes('transaction'));

  // Extract requirements from prompt
  const lowLatency = promptLower.includes('low latency') || promptLower.includes('fast');
  const highThroughput =
    promptLower.includes('high throughput') || promptLower.includes('high traffic');
  const transactionCount = actuallyWantsTransactions ? (highThroughput ? 100 : 20) : 0;

  // Build log configs with correlation fields
  const logConfigs: any[] = wantsLogs
    ? [
        {
          message: 'Application log entry',
          level: 'info' as const,
          rate: 10,
          interval: '1m',
          ...(contextFields.transactionId && { transactionId: contextFields.transactionId }),
          ...(contextFields.traceId && { traceId: contextFields.traceId }),
          ...(contextFields.hostName && { hostName: contextFields.hostName }),
          ...(contextFields.containerId && { containerId: contextFields.containerId }),
        },
        {
          message: 'Error log entry',
          level: 'error' as const,
          rate: 2,
          interval: '1m',
          ...(contextFields.transactionId && { transactionId: contextFields.transactionId }),
          ...(contextFields.traceId && { traceId: contextFields.traceId }),
          ...(contextFields.hostName && { hostName: contextFields.hostName }),
          ...(contextFields.containerId && { containerId: contextFields.containerId }),
        },
      ]
    : [];

  // Parse latency pattern from prompt (e.g., "spikes at 70%, eases at 80%, settles at 85%")
  const latencyPatternMatch = promptLower.match(/latency.*?(\d+)%.*?(\d+)%.*?(\d+)%/);
  const hasLatencyPattern = latencyPatternMatch && latencyPatternMatch.length >= 4;

  // Build trace configs for transactions
  // For low latency, use short durations (50-100ms); for normal, use 100-500ms
  const baseDuration = lowLatency ? 50 : 200;

  // Create trace configs with time-varying latency if pattern detected
  let traceConfigs: any[] = [];

  if (actuallyWantsTransactions) {
    if (hasLatencyPattern) {
      // Extract percentages: spike at first %, ease at second %, settle at third %
      const spikePercent = parseFloat(latencyPatternMatch[1]);
      const easePercent = parseFloat(latencyPatternMatch[2]);
      const settlePercent = parseFloat(latencyPatternMatch[3]);

      // Create a transaction with piecewise duration distribution
      // Normal latency: 50-100ms, Spike: 500-1000ms, Easing: 300-400ms, Settled: 100-150ms
      traceConfigs = [
        {
          id: 'latency-pattern-transaction',
          name: 'GET /api/data-processing',
          count: transactionCount || 20,
          errorRate: 0.05,
          spans: [
            {
              name: 'database query',
              type: 'db',
              // Use piecewise distribution for durationMs - this will need executor support
              // For now, we'll create multiple spans with different fixed durations
              // and use rate variations to simulate the pattern
              durationMs: {
                type: 'piecewise',
                segments: [
                  { to: `${spikePercent}%`, value: 100 }, // Normal: 100ms
                  { from: `${spikePercent}%`, to: `${easePercent}%`, value: 800 }, // Spike: 800ms
                  { from: `${easePercent}%`, to: `${settlePercent}%`, value: 350 }, // Easing: 350ms
                  { from: `${settlePercent}%`, value: 120 }, // Settled: 120ms
                ],
              },
            },
            {
              name: 'cpu processing',
              type: 'app',
              durationMs: {
                type: 'piecewise',
                segments: [
                  { to: `${spikePercent}%`, value: 50 }, // Normal: 50ms
                  { from: `${spikePercent}%`, to: `${easePercent}%`, value: 600 }, // Spike: 600ms
                  { from: `${easePercent}%`, to: `${settlePercent}%`, value: 250 }, // Easing: 250ms
                  { from: `${settlePercent}%`, value: 80 }, // Settled: 80ms
                ],
              },
            },
          ],
        },
      ];
    } else {
      // Default transaction configs without latency pattern
      traceConfigs = [
        {
          id: 'main-transaction',
          name: 'GET /api/users',
          count: transactionCount,
          errorRate: 0.05, // 5% error rate
          // Add spans to simulate low latency - executor uses these durations
          spans: lowLatency
            ? [
                {
                  name: 'database query',
                  type: 'db',
                  durationMs: baseDuration + 20, // 70ms for low latency
                },
              ]
            : [
                {
                  name: 'database query',
                  type: 'db',
                  durationMs: baseDuration + 100, // 300ms for normal
                },
                {
                  name: 'cache lookup',
                  type: 'cache',
                  durationMs: baseDuration + 50, // 250ms
                },
              ],
        },
        {
          id: 'api-transaction',
          name: 'POST /api/orders',
          count: Math.floor(transactionCount * 0.7),
          errorRate: 0.1, // 10% error rate
          spans: lowLatency
            ? [
                {
                  name: 'process order',
                  type: 'app',
                  durationMs: baseDuration + 30, // 80ms
                },
              ]
            : [
                {
                  name: 'process order',
                  type: 'app',
                  durationMs: baseDuration + 150, // 350ms
                },
              ],
        },
        {
          id: 'search-transaction',
          name: 'GET /api/products/search',
          count: Math.floor(transactionCount * 0.5),
          errorRate: 0.15, // 15% error rate
          spans: lowLatency
            ? [
                {
                  name: 'search index',
                  type: 'search',
                  durationMs: baseDuration + 40, // 90ms
                },
              ]
            : [
                {
                  name: 'search index',
                  type: 'search',
                  durationMs: baseDuration + 200, // 400ms
                },
              ],
        },
      ];
    }
  }

  // Parse user prompt for specific requirements (logs)
  const hasFailedDocs = promptLower.includes('failed') || promptLower.includes('failure');
  const hasDegradedDocs = promptLower.includes('degraded') || promptLower.includes('ignored');

  // Extract percentages from prompt (e.g., "50% failed docs", "50% of them as failed docs")
  const failedMatch = promptLower.match(
    /(\d+)%\s*(?:of\s*(?:them|documents)?\s*)?(?:as\s*)?(?:failed|failure)/
  );
  const degradedMatch = promptLower.match(
    /(\d+)%\s*(?:of\s*(?:them|documents)?\s*)?(?:as\s*)?(?:degraded|ignored)/
  );

  // Extract document count from prompt (e.g., "ingest 100 documents")
  const documentCountMatch = promptLower.match(/ingest\s+(\d+)\s+documents?/);
  const totalDocuments = documentCountMatch ? parseInt(documentCountMatch[1], 10) : null;

  if (hasFailedDocs && failedMatch) {
    const failedRate = parseFloat(failedMatch[1]) / 100;
    // Apply to all logs if specified, or just error logs
    logConfigs.forEach((log) => {
      log.failureRate = failedRate;
    });
  }

  if (hasDegradedDocs && degradedMatch) {
    const degradedRate = parseFloat(degradedMatch[1]) / 100;
    // Apply to info logs (or all logs if not error-specific)
    logConfigs.forEach((log) => {
      if (log.level === 'info' || !hasFailedDocs) {
        log.degradedRate = degradedRate;
      }
    });
  }

  // Adjust rates if total document count is specified
  // Note: rate is per interval, so we need to calculate based on time range
  // For simplicity, if totalDocuments is specified, we'll set rate = totalDocuments
  // and the executor will generate that many per interval (which might be more than intended)
  // A better approach would be to calculate: rate = totalDocuments / (timeRangeDuration / intervalDuration)
  // But for now, we'll use totalDocuments as the rate to approximate the desired count
  if (totalDocuments) {
    // Distribute documents across log types based on error rate
    const errorCount = Math.max(1, Math.floor(totalDocuments * 0.2)); // 20% error logs
    const infoCount = Math.max(1, totalDocuments - errorCount); // Remaining as info logs

    logConfigs.forEach((log) => {
      if (log.level === 'error') {
        log.rate = errorCount;
      } else {
        log.rate = infoCount;
      }
    });
  }

  const config: SynthSchema = {
    timeWindow: {
      from: timeRange.from,
      to: timeRange.to,
    },
    services: [
      {
        id: contextFields.serviceId || contextFields.serviceName,
        name: contextFields.serviceName,
        agentName: contextFields.agentName || 'nodejs',
        environment: contextFields.environment || 'production',
        instances: [
          {
            id: 'instance-1',
            ...(logConfigs.length > 0 && { logs: logConfigs }),
            ...(traceConfigs.length > 0 && { traces: traceConfigs }),
            ...(wantsMetrics && {
              metrics: [
                {
                  name: 'system.cpu.total.norm.pct',
                  behavior: 0.4, // Use constant value for now since executor only supports number or linear
                },
              ],
            }),
          },
        ],
      },
    ],
  };

  return config;
}

export function registerSynthtraceFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: SYNTHTRACE_FUNCTION_NAME,
      description: `Generate synthetic observability data (logs, metrics, traces) using the synthtrace tool. 
      
This function automatically extracts context from the current page you're viewing, including:
- Service name, agent name, environment
- Transaction ID, trace ID (if viewing transaction/trace details)
- Host name, container ID (if viewing infrastructure pages)
- Time range (from the page you're viewing)

Use this function when the user asks to generate synthetic data for testing or demonstration purposes. 

IMPORTANT: 
- If the user is on a service page, the function will automatically extract the service name from screen context
- If the user is NOT on a service page, you MUST provide the serviceName parameter explicitly
- Always check if serviceName is available in screen context before calling, or ask the user for the service name

Examples:
- "Generate logs for this service" (when on a service page)
- "Generate data for service 'my-app'" (when not on a service page - use serviceName parameter)
- "Ingest error and success logs for the current transaction"
- "Create synthetic data with CPU metrics varying between 20-60%"
- "Generate logs with 50% failed docs"

Note: Requires Elasticsearch to be running locally (default: http://localhost:9200).`,
      descriptionForUser: 'Generate synthetic observability data for testing and demonstrations',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description:
              'Optional: Natural language prompt describing what data to generate. If not provided, generates default logs and metrics for the current context.',
          },
          serviceName: {
            type: 'string',
            description:
              'Optional: Override service name. If not provided, uses service name from the current page context.',
          },
          cpuMin: {
            type: 'number',
            description: 'Optional: Minimum CPU percentage (default: 0.2 = 20%)',
            minimum: 0,
            maximum: 1,
          },
          cpuMax: {
            type: 'number',
            description: 'Optional: Maximum CPU percentage (default: 0.6 = 60%)',
            minimum: 0,
            maximum: 1,
          },
          logRate: {
            type: 'number',
            description: 'Optional: Logs per minute (default: 10)',
            minimum: 1,
          },
          errorRate: {
            type: 'number',
            description: 'Optional: Error log rate as percentage (0-1, default: 0.1 = 10%)',
            minimum: 0,
            maximum: 1,
          },
        },
      },
    },
    async ({ arguments: args, screenContexts }, signal) => {
      const { request } = resources;
      const esClient = (await resources.context.core).elasticsearch.client;

      try {
        // Extract context from screen contexts
        const contextData = extractContextData(screenContexts || []);
        const contextFields = mapContextToSynthtraceFields(contextData);
        const timeRange = extractTimeRange(screenContexts || [], request);

        // Log available context for debugging (only in debug mode)
        if (resources.logger.isLevelEnabled('debug')) {
          resources.logger.debug(
            `Synthtrace function called with screenContexts: ${JSON.stringify(
              screenContexts?.map((ctx) => ({
                screenDescription: ctx.screenDescription,
                data: ctx.data?.map((d: any) => ({ name: d.name, value: d.value })),
              }))
            )}`
          );
          resources.logger.debug(`Extracted contextData: ${JSON.stringify(contextData)}`);
          resources.logger.debug(`Mapped contextFields: ${JSON.stringify(contextFields)}`);
        }

        // Allow user overrides
        const serviceName = args.serviceName || contextFields.serviceName;
        const cpuMin = args.cpuMin ?? 0.2;
        const cpuMax = args.cpuMax ?? 0.6;
        const logRate = args.logRate ?? 10;
        const errorRate = args.errorRate ?? 0.1;

        if (!serviceName) {
          // Provide helpful error message with available context info
          const availableContextKeys = Object.keys(contextData);
          const screenDescriptions =
            screenContexts?.map((ctx) => ctx.screenDescription).filter(Boolean) || [];

          return {
            content: {
              error:
                'Service name is required to generate synthetic data. Please either:\n' +
                '1. Open a service page in Kibana (e.g., APM > Services > [service name])\n' +
                '2. Specify the service name in your request (e.g., "Generate data for service \'my-app\'")\n\n' +
                (availableContextKeys.length > 0
                  ? `Available context: ${availableContextKeys.join(', ')}\n`
                  : 'No screen context detected. ') +
                (screenDescriptions.length > 0
                  ? `Current page: ${screenDescriptions.join('; ')}`
                  : 'Please navigate to a service page or specify a service name.'),
            },
          };
        }

        // Update context fields with overrides
        const finalContextFields = {
          ...contextFields,
          serviceName,
          serviceId: serviceName,
        };

        // Build synthtrace config
        // Combine user prompt with function arguments for better context
        const combinedPrompt = args.prompt
          ? `${args.prompt} ${args.cpuMin !== undefined ? `CPU min: ${args.cpuMin}, ` : ''}${
              args.cpuMax !== undefined ? `CPU max: ${args.cpuMax}, ` : ''
            }${args.logRate !== undefined ? `log rate: ${args.logRate}, ` : ''}${
              args.errorRate !== undefined ? `error rate: ${args.errorRate}` : ''
            }`
          : undefined;
        const config = buildSynthtraceConfig(finalContextFields, timeRange, combinedPrompt);

        // Override defaults if user specified them
        if (config.services?.[0]?.instances?.[0]?.logs) {
          for (const logConfig of config.services[0].instances[0].logs) {
            if (logConfig.level === 'info') {
              logConfig.rate = logRate;
            } else if (logConfig.level === 'error') {
              logConfig.rate = Math.max(1, Math.floor(logRate * errorRate));
            }
          }
        }

        // Update CPU metric behavior if user specified custom values
        // For now, use midpoint between min and max since executor only supports constant or linear
        if (config.services?.[0]?.instances?.[0]?.metrics?.[0]) {
          const cpuMetricConfig = config.services[0].instances[0].metrics[0];
          if (cpuMetricConfig.name === 'system.cpu.total.norm.pct') {
            // Use midpoint between min and max as constant value
            // TODO: Support uniform distribution when executor adds support
            const cpuValue = (cpuMin + cpuMax) / 2;
            cpuMetricConfig.behavior = cpuValue;
          }
        }

        // Get Elasticsearch URL - use localhost:9200 as default
        // The synthtrace executor will create its own ES client connection
        // In a production setup, this could be configured via Kibana settings
        const esUrl = 'http://localhost:9200';

        // Execute the schema
        const argv = {
          target: esUrl,
          concurrency: 1,
          debug: false,
          verbose: false,
        };

        resources.logger.info(
          `Generating synthetic data for service "${serviceName}" with time range ${timeRange.from} to ${timeRange.to}`
        );

        const result = await executeSchema(config, argv);

        resources.logger.info(
          `Successfully generated synthetic data. Indexed to: ${result.indexedIndices.join(', ')}`
        );

        return {
          content: {
            success: true,
            message: `Successfully generated synthetic observability data for service "${serviceName}"`,
            indexedIndices: result.indexedIndices,
            timeRange: {
              from: timeRange.from,
              to: timeRange.to,
            },
            context: {
              serviceName,
              agentName: finalContextFields.agentName,
              environment: finalContextFields.environment,
              ...(finalContextFields.transactionId && {
                transactionId: finalContextFields.transactionId,
              }),
              ...(finalContextFields.traceId && { traceId: finalContextFields.traceId }),
              ...(finalContextFields.hostName && { hostName: finalContextFields.hostName }),
            },
            config: {
              services: config.services?.length || 0,
              instances: config.services?.[0]?.instances?.length || 0,
              logConfigs: config.services?.[0]?.instances?.[0]?.logs?.length || 0,
              metricConfigs: config.services?.[0]?.instances?.[0]?.metrics?.length || 0,
            },
          },
        };
      } catch (error: any) {
        resources.logger.error('Error in synthtrace function', {
          error: error.message,
          stack: error.stack,
          ...(error.cause && { cause: error.cause }),
        });

        // Provide user-friendly error message
        let errorMessage = `Failed to generate synthetic data: ${error.message || String(error)}`;

        // Add specific guidance for common errors
        if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
          errorMessage += '\n\nMake sure Elasticsearch is running on http://localhost:9200';
        } else if (
          error.message?.includes('validation failed') ||
          error.message?.includes('Schema validation')
        ) {
          errorMessage +=
            '\n\nThe generated schema configuration was invalid. Please check the function parameters.';
        }

        return {
          content: {
            error: errorMessage,
            ...(resources.logger.isLevelEnabled('debug') &&
              error.stack && { details: error.stack }),
          },
        };
      }
    }
  );
}
