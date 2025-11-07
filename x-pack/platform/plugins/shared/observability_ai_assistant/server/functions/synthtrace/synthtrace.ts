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
 * Extract context from URL query parameters
 */
function extractUrlContext(request: any): Record<string, string> {
  const urlContext: Record<string, string> = {};

  if (request?.url) {
    try {
      const url = new URL(request.url, 'http://localhost');
      const params = url.searchParams;

      // Extract all relevant query parameters
      // Note: searchParams.get() automatically decodes URL-encoded values
      if (params.get('rangeFrom')) urlContext.rangeFrom = params.get('rangeFrom')!;
      if (params.get('rangeTo')) urlContext.rangeTo = params.get('rangeTo')!;
      if (params.get('transactionId')) urlContext.transactionId = params.get('transactionId')!;
      if (params.get('traceId')) urlContext.traceId = params.get('traceId')!;
      if (params.get('transactionName'))
        urlContext.transactionName = decodeURIComponent(params.get('transactionName')!);
      if (params.get('transactionType'))
        urlContext.transactionType = decodeURIComponent(params.get('transactionType')!);
      if (params.get('serviceName')) urlContext.serviceName = params.get('serviceName')!;
      if (params.get('monitorId')) urlContext.monitorId = params.get('monitorId')!;
      if (params.get('monitorName'))
        urlContext.monitorName = decodeURIComponent(params.get('monitorName')!);
      if (params.get('monitorOrigin')) urlContext.monitorOrigin = params.get('monitorOrigin')!;
      if (params.get('location')) urlContext.location = params.get('location')!;
      // Handle environment - ENVIRONMENT_ALL means "all environments", so we skip it
      const environment = params.get('environment');
      if (environment && environment !== 'ENVIRONMENT_ALL') {
        urlContext.environment = environment;
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  return urlContext;
}

/**
 * Extract time range from screen context or URL
 */
function extractTimeRange(screenContexts: any[], request: any): { from: string; to: string } {
  const contextData = extractContextData(screenContexts);
  const urlContext = extractUrlContext(request);

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
  if (urlContext.rangeFrom && urlContext.rangeTo) {
    return { from: urlContext.rangeFrom, to: urlContext.rangeTo };
  }

  // Default to last hour
  return { from: 'now-1h', to: 'now' };
}

/**
 * Map context data to synthtrace schema fields
 */
function mapContextToSynthtraceFields(
  contextData: Record<string, any>,
  urlContext: Record<string, string> = {}
) {
  const fields: {
    serviceName?: string;
    serviceId?: string;
    agentName?: string;
    agentId?: string;
    environment?: string;
    transactionId?: string;
    traceId?: string;
    transactionName?: string;
    transactionType?: string;
    hostName?: string;
    containerId?: string;
    logFilePath?: string;
    monitorId?: string;
    monitorName?: string;
    monitorOrigin?: string;
  } = {};

  // Service name/id - check multiple possible keys, URL params take precedence
  // The screen context uses 'service_name' as the key
  fields.serviceName =
    urlContext.serviceName ||
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

  // Agent ID
  fields.agentId =
    contextData.agent_id || contextData['agent.id'] || contextData.agentId || contextData.agent?.id;

  // Environment - URL params take precedence, skip ENVIRONMENT_ALL
  fields.environment =
    urlContext.environment ||
    contextData.environment ||
    contextData['service.environment'] ||
    contextData.service?.environment ||
    'production'; // Default

  // Transaction type - URL params take precedence
  fields.transactionType =
    urlContext.transactionType ||
    contextData.transaction_type ||
    contextData['transaction.type'] ||
    contextData.transactionType ||
    contextData.transaction?.type;

  // Transaction ID - URL params take precedence
  fields.transactionId =
    urlContext.transactionId ||
    contextData.transaction_id ||
    contextData['transaction.id'] ||
    contextData.transactionId ||
    contextData.transaction?.id;

  // Trace ID - URL params take precedence
  fields.traceId =
    urlContext.traceId ||
    contextData.trace_id ||
    contextData['trace.id'] ||
    contextData.traceId ||
    contextData.trace?.id;

  // Transaction name - URL params take precedence
  fields.transactionName =
    urlContext.transactionName ||
    contextData.transaction_name ||
    contextData['transaction.name'] ||
    contextData.transactionName ||
    contextData.transaction?.name;

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

  // Log file path
  fields.logFilePath =
    contextData.log_file_path ||
    contextData['log.file.path'] ||
    contextData.logFilePath ||
    contextData.log?.file?.path;

  // Monitor ID - URL params take precedence
  fields.monitorId =
    urlContext.monitorId ||
    contextData.monitor_id ||
    contextData['monitor.id'] ||
    contextData.monitorId ||
    contextData.monitor?.id;

  // Monitor Name - URL params take precedence
  fields.monitorName =
    urlContext.monitorName ||
    contextData.monitor_name ||
    contextData['monitor.name'] ||
    contextData.monitorName ||
    contextData.monitor?.name;

  // Monitor Origin/Location - URL params take precedence
  // Origin represents the location where the monitor runs from (e.g., "us-east-1", "eu-west-1")
  fields.monitorOrigin =
    urlContext.monitorOrigin ||
    urlContext.location ||
    contextData.monitor_origin ||
    contextData['monitor.origin'] ||
    contextData.location ||
    contextData['location.id'] ||
    contextData.monitorOrigin ||
    contextData.monitor?.origin ||
    contextData.monitor?.location;

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

  // Check if user wants synthetics monitors
  const wantsSynthetics =
    promptLower.includes('monitor') ||
    promptLower.includes('synthetics') ||
    promptLower.includes('synthetic') ||
    contextFields.monitorId; // If monitor ID is in context, generate synthetics

  // Extract requirements from prompt
  const lowLatency = promptLower.includes('low latency') || promptLower.includes('fast');
  const highThroughput =
    promptLower.includes('high throughput') || promptLower.includes('high traffic');
  const transactionCount = actuallyWantsTransactions ? (highThroughput ? 100 : 20) : 0;

  // Parse custom index name from prompt (e.g., "index name as logs-ghost.rider-default")
  // Format: logs-{dataset}-{namespace}
  let customDataset: string | undefined;
  let customNamespace: string | undefined;
  const indexNameMatch = (userPrompt || '').match(
    /(?:index\s+name\s+(?:as|is)\s+)?logs-([^-]+)-([^\s]+)/i
  );
  if (indexNameMatch && indexNameMatch.length >= 3) {
    customDataset = indexNameMatch[1];
    customNamespace = indexNameMatch[2];
  }

  // Extract document count from prompt (e.g., "generate 10 documents")
  const documentCountMatch = (userPrompt || '').match(
    /(?:generate|ingest|create)\s+(\d+)\s+documents?/i
  );
  const requestedDocumentCount = documentCountMatch ? parseInt(documentCountMatch[1], 10) : null;

  // Build log configs with correlation fields
  // Use custom dataset/namespace if specified in prompt, otherwise use defaults
  const defaultDataset = customDataset || 'apache';
  const defaultNamespace = customNamespace || 'success';
  const errorNamespace = customNamespace || 'error';

  // Calculate rate based on requested document count
  // If user specified a count, generate only info logs with that exact count
  // Otherwise, use default rates (10 info, 2 error)
  const logConfigs: any[] = wantsLogs
    ? [
        {
          message: contextFields.transactionName
            ? `Transaction log: ${contextFields.transactionName}`
            : 'Application log entry',
          level: 'info' as const,
          rate: requestedDocumentCount !== null ? requestedDocumentCount : 10,
          interval: '1m',
          dataset: defaultDataset,
          namespace: defaultNamespace,
          ...(contextFields.transactionId && { transactionId: contextFields.transactionId }),
          ...(contextFields.traceId && { traceId: contextFields.traceId }),
          ...(contextFields.agentId && { agentId: contextFields.agentId }),
          ...(contextFields.agentName && { agentName: contextFields.agentName }),
          ...(contextFields.hostName && { hostName: contextFields.hostName }),
          ...(contextFields.containerId && { containerId: contextFields.containerId }),
          ...(contextFields.logFilePath && { logFilePath: contextFields.logFilePath }),
          // Add transaction type via customFields (will be indexed as log.custom.transaction.type)
          // Using advanced config with empty namespace to avoid log.custom prefix
          ...(contextFields.transactionType && {
            customFields: {
              fields: [
                {
                  name: 'transaction.type',
                  valueType: 'fixed' as const,
                  value: contextFields.transactionType,
                },
              ],
              namespace: '', // Empty namespace means no log.custom prefix
            },
          }),
        },
        // Only add error logs if no specific document count was requested
        ...(requestedDocumentCount === null
          ? [
              {
                message: contextFields.transactionName
                  ? `Error log: ${contextFields.transactionName}`
                  : 'Error log entry',
                level: 'error' as const,
                rate: 2,
                interval: '1m',
                dataset: defaultDataset,
                namespace: errorNamespace,
                ...(contextFields.transactionId && { transactionId: contextFields.transactionId }),
                ...(contextFields.traceId && { traceId: contextFields.traceId }),
                ...(contextFields.agentId && { agentId: contextFields.agentId }),
                ...(contextFields.agentName && { agentName: contextFields.agentName }),
                ...(contextFields.hostName && { hostName: contextFields.hostName }),
                ...(contextFields.containerId && { containerId: contextFields.containerId }),
                ...(contextFields.logFilePath && { logFilePath: contextFields.logFilePath }),
                // Add transaction type via customFields (will be indexed as log.custom.transaction.type)
                // Using advanced config with empty namespace to avoid log.custom prefix
                ...(contextFields.transactionType && {
                  customFields: {
                    fields: [
                      {
                        name: 'transaction.type',
                        valueType: 'fixed' as const,
                        value: contextFields.transactionType,
                      },
                    ],
                    namespace: '', // Empty namespace means no log.custom prefix
                  },
                }),
              },
            ]
          : []),
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

  // Note: Document count handling is now done earlier when building logConfigs
  // (lines 285-289 and 329) to properly set rates based on requested count

  // Parse monitor-specific requirements from prompt
  // Extract response time range (e.g., "response times varying between 200ms and 2000ms")
  const responseTimeMatch = promptLower.match(
    /(?:response\s+times?|latency|duration).*?(?:between|varying).*?(\d+)\s*ms.*?(\d+)\s*ms/i
  );
  const minDurationMs = responseTimeMatch ? parseInt(responseTimeMatch[1], 10) : 200;
  const maxDurationMs = responseTimeMatch ? parseInt(responseTimeMatch[2], 10) : 2000;

  // Extract error rate for monitors (e.g., "errorRate: 0.1" or "10% error rate")
  const monitorErrorRateMatch = promptLower.match(
    /(?:error\s+rate|failure\s+rate).*?(\d+(?:\.\d+)?)%?/i
  );
  const monitorErrorRate = monitorErrorRateMatch ? parseFloat(monitorErrorRateMatch[1]) / 100 : 0.1; // Default 10% error rate for monitors

  // Build synthetics monitor configs
  // For synthetics monitors, monitorId and origin (location) are required
  const syntheticsConfigs: any[] = wantsSynthetics
    ? (() => {
        // Validate required fields
        if (!contextFields.monitorId) {
          throw new Error(
            'monitorId is required to generate synthetics monitor data. Please either:\n' +
              '1. Open a monitor detail page in Kibana (which includes monitorId in the URL)\n' +
              '2. Specify the monitorId in your request (e.g., "Generate data for monitor ID: 043533cc-de41-4711-afa2-26237ce70a01")'
          );
        }

        // Origin/location is required - use default if not provided
        const origin = contextFields.monitorOrigin || 'default-location';

        return [
          {
            name: contextFields.monitorName || `Monitor for ${contextFields.serviceName}`,
            type: 'http' as const, // Default to HTTP monitor
            rate: 1, // 1 check per interval
            interval: '1m',
            monitorId: contextFields.monitorId, // Required
            origin, // Required: location where monitor runs from
            errorRate: monitorErrorRate,
            durationMs: {
              type: 'uniform' as const,
              min: minDurationMs,
              max: maxDurationMs,
            },
          },
        ];
      })()
    : [];

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
            ...(syntheticsConfigs.length > 0 && { synthetics: syntheticsConfigs }),
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
- Service name, agent name, environment (from screen context or URL query parameters)
- Transaction ID, trace ID, transaction name (from URL query parameters if viewing transaction/trace details)
- Host name, container ID (if viewing infrastructure pages)
- Time range (from screen context or URL query parameters like rangeFrom/rangeTo)

When the user is on a transaction detail page (URL contains transactionId/traceId), the function will automatically:
- Generate logs correlated with that transaction/trace (using the transactionId and traceId from URL)
- Use the appropriate log indices (e.g., logs-apache.success-default, logs-apache.error-default)
- Use the transaction name from the URL in log messages
- Generate logs within the current page's time range

Use this function when the user asks to generate synthetic data for testing or demonstration purposes. 

IMPORTANT: 
- If the user is on a service/transaction page, the function will automatically extract all context from screen context and URL
- If the user is NOT on a service page, you MUST provide the serviceName parameter explicitly
- Always check if serviceName is available in screen context or URL before calling, or ask the user for the service name
- When user says "generate logs for the current context", use ALL available context (service, transaction, trace, time range)

Examples:
- "Generate logs for this service" (when on a service page - uses service name and time range)
- "Generate some logs for the current context" (when on transaction page - uses transactionId, traceId, service name, time range)
- "Generate data for service 'my-app'" (when not on a service page - use serviceName parameter)
- "Ingest error and success logs for the current transaction" (uses transaction context from URL)
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

      try {
        // Extract context from screen contexts and URL
        const contextData = extractContextData(screenContexts || []);
        const urlContext = extractUrlContext(request);
        const contextFields = mapContextToSynthtraceFields(contextData, urlContext);
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
        // Only use logRate if explicitly provided, otherwise let buildSynthtraceConfig handle it from prompt
        const logRate = args.logRate;
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

        // Override defaults if user explicitly specified them via function arguments
        // Note: If document count was parsed from prompt, buildSynthtraceConfig already set the rate correctly
        if (config.services?.[0]?.instances?.[0]?.logs && logRate !== undefined) {
          for (const logConfig of config.services[0].instances[0].logs as any[]) {
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
