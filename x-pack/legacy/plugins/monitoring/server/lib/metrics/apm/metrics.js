/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LARGE_BYTES, LARGE_FLOAT } from '../../../../common/formatting';
import { ApmMetric, ApmCpuUtilizationMetric, ApmEventsRateClusterMetric } from './classes';
import { i18n } from '@kbn/i18n';

const instanceSystemLoadTitle = i18n.translate(
  'xpack.monitoring.metrics.apmInstance.systemLoadTitle',
  {
    defaultMessage: 'System Load',
  }
);
const instanceMemoryTitle = i18n.translate('xpack.monitoring.metrics.apmInstance.memoryTitle', {
  defaultMessage: 'Memory',
});
const transformationsTitle = i18n.translate('xpack.monitoring.metrics.apm.transformationsTitle', {
  defaultMessage: 'Transformations',
});

export const metrics = {
  apm_cpu_total: new ApmCpuUtilizationMetric({
    title: i18n.translate('xpack.monitoring.metrics.apmInstance.cpuUtilizationTitle', {
      defaultMessage: 'CPU Utilization',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apmInstance.cpuUtilization.totalLabel', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.apmInstance.cpuUtilization.totalDescription',
      {
        defaultMessage:
          'Percentage of CPU time spent executing (user+kernel mode) for the APM process',
      }
    ),
    field: 'beats_stats.metrics.beat.cpu.total.value',
  }),
  apm_system_os_load_1: new ApmMetric({
    field: 'beats_stats.metrics.system.load.1',
    label: i18n.translate('xpack.monitoring.metrics.apmInstance.systemLoad.last1MinuteLabel', {
      defaultMessage: '1m',
    }),
    title: instanceSystemLoadTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.apmInstance.systemLoad.last1MinuteDescription',
      {
        defaultMessage: 'Load average over the last 1 minute',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  apm_system_os_load_5: new ApmMetric({
    field: 'beats_stats.metrics.system.load.5',
    label: i18n.translate('xpack.monitoring.metrics.apmInstance.systemLoad.last5MinutesLabel', {
      defaultMessage: '5m',
    }),
    title: instanceSystemLoadTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.apmInstance.systemLoad.last5MinutesDescription',
      {
        defaultMessage: 'Load average over the last 5 minutes',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  apm_system_os_load_15: new ApmMetric({
    field: 'beats_stats.metrics.system.load.15',
    label: i18n.translate('xpack.monitoring.metrics.apmInstance.systemLoad.last15MinutesLabel', {
      defaultMessage: '15m',
    }),
    title: instanceSystemLoadTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.apmInstance.systemLoad.last15MinutesDescription',
      {
        defaultMessage: 'Load average over the last 15 minutes',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),

  apm_mem_gc_next: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.gc_next',
    label: i18n.translate('xpack.monitoring.metrics.apmInstance.memory.gcNextLabel', {
      defaultMessage: 'GC Next',
    }),
    title: instanceMemoryTitle,
    description: i18n.translate('xpack.monitoring.metrics.apmInstance.memory.gcNextDescription', {
      defaultMessage: 'Limit of allocated memory at which garbage collection will occur',
    }),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  apm_mem_alloc: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.memory_alloc',
    label: i18n.translate('xpack.monitoring.metrics.apmInstance.memory.allocatedMemoryLabel', {
      defaultMessage: 'Allocated Memory',
    }),
    title: instanceMemoryTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.apmInstance.memory.allocatedMemoryDescription',
      {
        defaultMessage: 'Allocated memory',
      }
    ),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  apm_mem_rss: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.rss',
    label: i18n.translate('xpack.monitoring.metrics.apmInstance.memory.processTotalLabel', {
      defaultMessage: 'Process Total',
    }),
    title: instanceMemoryTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.apmInstance.memory.processTotalDescription',
      {
        defaultMessage: 'Resident set size of memory reserved by the APM service from the OS',
      }
    ),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),

  apm_server_requests: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.request.count',
    title: i18n.translate('xpack.monitoring.metrics.apm.requestsTitle', {
      defaultMessage: 'Request Count Intake API',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.requests.server.requestedLabel', {
      defaultMessage: 'Requested'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.requests.server.requestedDescription', {
      defaultMessage: 'HTTP Requests received by server'
    })
  }),
  apm_acm_requests: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.request.count',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.requestsTitle', {
      defaultMessage: 'Requests Count Agent Configuration Management',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.requests.requestedLabel', {
      defaultMessage: 'Requested'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.requests.requestedDescription', {
      defaultMessage: 'HTTP Requests received by ACM'
    })
  }),

  apm_server_responses_count: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.count',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseCountTitle', {
      defaultMessage: 'Response Count Intake API'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseCount.totalLabel', {
      defaultMessage: 'Total'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseCount.totalDescription', {
      defaultMessage: 'HTTP Requests responded to by server'
    })
  }),
  apm_server_responses_errors_count: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.count',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.errorsCountTitle', {
      defaultMessage: 'Errors'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.errorsCount.totalLabel', {
      defaultMessage: 'Errors'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.errorsCount.totalDescription', {
      defaultMessage: 'Errors'
    })
  }),

  apm_acm_responses_count: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.count',
    title: i18n.translate('xpack.monitoring.metrics.apm.acmResponseCountTitle', {
      defaultMessage: 'Response Count Agent Configuration Management'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.responseCount.totalLabel', {
      defaultMessage: 'Total'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.responseCount.totalDescription', {
      defaultMessage: 'HTTP Requests responded to by server'
    })
  }),
  apm_acm_responses_errors_count: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.errors.count',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.errorsCountTitle', {
      defaultMessage: 'Errors'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.errorCount.totalLabel', {
      defaultMessage: 'Errors'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.ErrorsCount.totalDescription', {
      defaultMessage: 'HTTP Errors'
    })
  }),
  apm_server_responses_valid_ok: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.valid.ok',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.response.okTitle', {
      defaultMessage: 'Ok'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.response.okLabel', {
      defaultMessage: 'Ok'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.response.okDescription', {
      defaultMessage: '200 OK response count'
    })
  }),
  apm_acm_responses_valid_ok: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.valid.ok',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.response.validOk.okTitle', {
      defaultMessage: 'Ok'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.response.validOk.okLabel', {
      defaultMessage: 'Ok'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.response.validOk.okDescription', {
      defaultMessage: '200 OK response count'
    })
  }),
  apm_acm_responses_valid_notmodified: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.valid.notmodified',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.response.validNotModified.okTitle', {
      defaultMessage: 'Not modified'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.response.validNotModified.okLabel', {
      defaultMessage: 'Not modified'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.response.okDescription', {
      defaultMessage: 'Not modified'
    })
  }),
  apm_server_responses_valid_accepted: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.valid.accepted',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.response.acceptedTitle', {
      defaultMessage: 'Accepted'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.response.acceptedLabel', {
      defaultMessage: 'Accepted'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.response.acceptedDescription', {
      defaultMessage: 'HTTP Requests successfully reporting new events'
    })
  }),
  apm_responses_valid_accepted_acm: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.valid.accepted',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.response.acceptedTitle', {
      defaultMessage: 'Accepted'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.response.acceptedLabel', {
      defaultMessage: 'Accepted'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.response.acceptedDescription', {
      defaultMessage: 'HTTP Requests successfully reporting new events'
    })
  }),
  apm_server_responses_errors_toolarge: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.toolarge',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrorsTitle', {
      defaultMessage: 'Too large'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.sever.responseErrors.tooLargeLabelTitle', {
      defaultMessage: 'Too large'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.tooLargeLabelDescription', {
      defaultMessage: 'HTTP Requests rejected due to excessive payload size'
    })
  }),
  apm_server_responses_errors_validate: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.validate',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.validateTitle', {
      defaultMessage: 'Validate'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.validateLabel', {
      defaultMessage: 'Validate'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.validateDescription', {
      defaultMessage: 'HTTP Requests rejected due to payload validation error'
    })
  }),
  apm_server_responses_errors_method: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.method',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.methodTitle', {
      defaultMessage: 'Method'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.methodLabel', {
      defaultMessage: 'Method'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.methodDescription', {
      defaultMessage: 'HTTP Requests rejected due to incorrect HTTP method'
    })
  }),
  apm_server_responses_errors_unauthorized: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.unauthorized',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.unauthorizedTitle', {
      defaultMessage: 'Unauthorized'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.unauthorizedLabel', {
      defaultMessage: 'Unauthorized'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.unauthorizedDescription', {
      defaultMessage: 'HTTP Requests rejected due to invalid secret token'
    })
  }),
  apm_server_responses_errors_ratelimit: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.ratelimit',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.rateLimitTitle', {
      defaultMessage: 'Rate limit'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.rateLimitLabel', {
      defaultMessage: 'Rate limit'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.rateLimitDescription', {
      defaultMessage: 'HTTP Requests rejected to due excessive rate limit'
    })
  }),
  apm_server_responses_errors_queue: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.queue',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.queueTitle', {
      defaultMessage: 'Queue'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.queueLabel', {
      defaultMessage: 'Queue'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.queueDescription', {
      defaultMessage: 'HTTP Requests rejected to due internal queue filling up'
    })
  }),
  apm_server_responses_errors_decode: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.decode',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.decodeTitle', {
      defaultMessage: 'Decode'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.decodeLabel', {
      defaultMessage: 'Decode'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.decodeDescription', {
      defaultMessage: 'HTTP Requests rejected to due decoding errors - invalid json, incorrect data type for entity'
    })
  }),
  apm_server_responses_errors_forbidden: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.forbidden',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.forbiddenTitle', {
      defaultMessage: 'Forbidden'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.forbiddenLabel', {
      defaultMessage: 'Forbidden'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.forbiddenDescription', {
      defaultMessage: 'Forbidden HTTP Requests'
    })
  }),
  apm_server_responses_errors_concurrency: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.concurrency',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.concurrencyTitle', {
      defaultMessage: 'Concurrency'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.concurrencyLabel', {
      defaultMessage: 'Concurrency'
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.apm.responseErrors.concurrencyDescription',
      {
        defaultMessage: 'HTTP Requests rejected due to overall concurrency limit breach',
      }
    ),
  }),
  apm_server_responses_errors_closed: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.closed',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.closedTitle', {
      defaultMessage: 'Closed'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.closedLabel', {
      defaultMessage: 'Closed'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.closedDescription', {
      defaultMessage: 'HTTP Requests rejected during server shutdown'
    })
  }),
  apm_server_responses_errors_internal: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.internal',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.internalTitle', {
      defaultMessage: 'Internal'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.internalLabel', {
      defaultMessage: 'Internal'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.responseErrors.internalDescription', {
      defaultMessage: 'HTTP Requests rejected due to a miscellaneous internal error'
    })
  }),

  apm_acm_responses_errors_forbidden: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.errors.forbidden',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.acmForbiddenTitle', {
      defaultMessage: 'Forbidden HTTP requests'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.acmForbiddenLabel', {
      defaultMessage: 'Forbidden'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.acmForbiddenDescription', {
      defaultMessage: 'Forbidden HTTP Requests rejected'
    })
  }),
  apm_acm_responses_errors_unauthorized: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.errors.unauthorized',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.acmUnauthorizedTitle', {
      defaultMessage: 'Unauthorized'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.acmUnauthorizedLabel', {
      defaultMessage: 'Unauthorized'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.acmForbiddenDescription', {
      defaultMessage: 'Forbidden HTTP Requests rejected - CORS violation, disabled enpoint'
    })
  }),
  apm_acm_responses_errors_unavailable: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.errors.unavailable',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.acmUnavailableTitle', {
      defaultMessage: 'Unavailable'
    }),
    label: i18n.translate('xpack.monitoring.metrics.acm.apm.responseErrors.acmUnavailableLabel', {
      defaultMessage: 'Unavailable'
    }),
    description: i18n.translate('xpack.monitoring.metrics.acm.apm.responseErrors.acmUnavailableDescription', {
      defaultMessage: 'Unavailable HTTP Responses. Possible misconfiguration, or unavailable/unsupported version of Kibana.'
    })
  }),
  apm_acm_responses_errors_method: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.errors.method',
    title: i18n.translate('xpack.monitoring.metrics.apm.server.acmResponseErrors.methodTitle', {
      defaultMessage: 'Method'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.server.acmResponseErrors.methodLabel', {
      defaultMessage: 'Method'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.server.acmResponseErrors.methodDescription', {
      defaultMessage: 'HTTP Requests rejected due to incorrect HTTP method'
    })
  }),
  apm_acm_responses_errors_invalid_query: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.acm.response.errors.invalidquery',
    title: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.invalidQueryTitle', {
      defaultMessage: 'Invalid Query'
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.invalidQueryLabel', {
      defaultMessage: 'Invalid Query'
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.acm.responseErrors.invalidQueryDescription', {
      defaultMessage: 'HTTP invalid query'
    })
  }),

  apm_processor_transaction_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.transaction.transformations',
    title: i18n.translate('xpack.monitoring.metrics.apm.processedEventsTitle', {
      defaultMessage: 'Processed Events',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.processedEvents.transactionLabel', {
      defaultMessage: 'Transaction',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.apm.processedEvents.transactionDescription',
      {
        defaultMessage: 'Transaction events processed',
      }
    ),
  }),
  apm_processor_span_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.span.transformations',
    title: transformationsTitle,
    label: i18n.translate('xpack.monitoring.metrics.apm.transformations.spanLabel', {
      defaultMessage: 'Span',
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.transformations.spanDescription', {
      defaultMessage: 'Span events processed',
    }),
  }),
  apm_processor_error_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.error.transformations',
    title: transformationsTitle,
    label: i18n.translate('xpack.monitoring.metrics.apm.transformations.errorLabel', {
      defaultMessage: 'Error',
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.transformations.errorDescription', {
      defaultMessage: 'Error events processed',
    }),
  }),
  apm_processor_metric_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.metric.transformations',
    title: transformationsTitle,
    label: i18n.translate('xpack.monitoring.metrics.apm.transformations.metricLabel', {
      defaultMessage: 'Metric',
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.transformations.metricDescription', {
      defaultMessage: 'Metric events processed',
    }),
  }),

  apm_output_events_total: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.total',
    title: i18n.translate('xpack.monitoring.metrics.apm.outputEventsRateTitle', {
      defaultMessage: 'Output Events Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.outputEventsRate.totalLabel', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate('xpack.monitoring.metrics.apm.outputEventsRate.totalDescription', {
      defaultMessage: 'Events processed by the output (including retries)',
    }),
  }),
  apm_output_events_failed: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.failed',
    title: i18n.translate('xpack.monitoring.metrics.apm.outputFailedEventsRateTitle', {
      defaultMessage: 'Output Failed Events Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.outputFailedEventsRate.failedLabel', {
      defaultMessage: 'Failed',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.apm.outputFailedEventsRate.failedDescription',
      {
        defaultMessage: 'Events processed by the output (including retries)',
      }
    ),
  }),
  apm_output_events_dropped: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.dropped',
    title: i18n.translate('xpack.monitoring.metrics.apm.outputDroppedEventsRateTitle', {
      defaultMessage: 'Output Dropped Events Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.outputDroppedEventsRate.droppedLabel', {
      defaultMessage: 'Dropped',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.apm.outputDroppedEventsRate.droppedDescription',
      {
        defaultMessage: 'Events processed by the output (including retries)',
      }
    ),
  }),
  apm_output_events_active: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.active',
    title: i18n.translate('xpack.monitoring.metrics.apm.outputActiveEventsRateTitle', {
      defaultMessage: 'Output Active Events Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.outputActiveEventsRate.activeLabel', {
      defaultMessage: 'Active',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.apm.outputActiveEventsRate.activeDescription',
      {
        defaultMessage: 'Events processed by the output (including retries)',
      }
    ),
  }),
  apm_output_events_acked: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.acked',
    title: i18n.translate('xpack.monitoring.metrics.apm.outputAckedEventsRateTitle', {
      defaultMessage: 'Output Acked Events Rate',
    }),
    label: i18n.translate('xpack.monitoring.metrics.apm.outputAckedEventsRate.ackedLabel', {
      defaultMessage: 'Acked',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.apm.outputAckedEventsRate.ackedDescription',
      {
        defaultMessage: 'Events processed by the output (including retries)',
      }
    ),
  }),
};
