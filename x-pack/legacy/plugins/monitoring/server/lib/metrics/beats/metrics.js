/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BeatsEventsRateClusterMetric,
  BeatsByteRateClusterMetric,
  BeatsEventsRateMetric,
  BeatsByteRateMetric,
  BeatsCpuUtilizationMetric,
  BeatsMetric,
} from './classes';
import { LARGE_FLOAT, LARGE_BYTES, SMALL_FLOAT } from '../../../../common/formatting';
import { i18n } from '@kbn/i18n';

const eventsRateTitle = i18n.translate('xpack.monitoring.metrics.beats.eventsRateTitle', {
  defaultMessage: 'Events Rate',
});
const throughputTitle = i18n.translate('xpack.monitoring.metrics.beats.throughputTitle', {
  defaultMessage: 'Throughput',
});
const failRatesTitle = i18n.translate('xpack.monitoring.metrics.beats.failRatesTitle', {
  defaultMessage: 'Fail Rates',
});
const outputErrorsTitle = i18n.translate('xpack.monitoring.metrics.beats.outputErrorsTitle', {
  defaultMessage: 'Output Errors',
});
const instanceEventsRateTitle = i18n.translate(
  'xpack.monitoring.metrics.beatsInstance.eventsRateTitle',
  {
    defaultMessage: 'Events Rate',
  }
);
const instanceFailRatesTitle = i18n.translate(
  'xpack.monitoring.metrics.beatsInstance.failRatesTitle',
  {
    defaultMessage: 'Fail Rates',
  }
);
const instanceThroughputTitle = i18n.translate(
  'xpack.monitoring.metrics.beatsInstance.throughputTitle',
  {
    defaultMessage: 'Throughput',
  }
);
const instanceOutputErrorsTitle = i18n.translate(
  'xpack.monitoring.metrics.beatsInstance.outputErrorsTitle',
  {
    defaultMessage: 'Output Errors',
  }
);
const instanceMemoryTitle = i18n.translate('xpack.monitoring.metrics.beatsInstance.memoryTitle', {
  defaultMessage: 'Memory',
});
const instanceSystemLoadTitle = i18n.translate(
  'xpack.monitoring.metrics.beatsInstance.systemLoadTitle',
  {
    defaultMessage: 'System Load',
  }
);

export const metrics = {
  beat_cluster_pipeline_events_total_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.total',
    title: eventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.eventsRate.totalLabel', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate('xpack.monitoring.metrics.beats.eventsRate.totalDescription', {
      defaultMessage: 'All events newly created in the publishing pipeline',
    }),
  }),
  beat_cluster_output_events_total: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.total',
    title: eventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.eventsRate.emittedLabel', {
      defaultMessage: 'Emitted',
    }),
    description: i18n.translate('xpack.monitoring.metrics.beats.eventsRate.emittedDescription', {
      defaultMessage: 'Events processed by the output (including retries)',
    }),
  }),
  beat_cluster_output_events_ack_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.acked',
    title: eventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.eventsRate.acknowledgedLabel', {
      defaultMessage: 'Acknowledged',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beats.eventsRate.acknowledgedDescription',
      {
        defaultMessage: 'Events acknowledged by the output (includes events dropped by the output)',
      }
    ),
  }),
  beat_cluster_pipeline_events_emitted_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.published',
    title: eventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.eventsRate.queuedLabel', {
      defaultMessage: 'Queued',
    }),
    description: i18n.translate('xpack.monitoring.metrics.beats.eventsRate.queuedDescription', {
      defaultMessage: 'Events added to the event pipeline queue',
    }),
  }),

  beat_cluster_output_write_bytes_rate: new BeatsByteRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.write.bytes',
    title: throughputTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.throughput.bytesSentLabel', {
      defaultMessage: 'Bytes Sent',
    }),
    description: i18n.translate('xpack.monitoring.metrics.beats.throughput.bytesSentDescription', {
      defaultMessage:
        'Bytes written to the output (consists of size of network headers and compressed payload)',
    }),
  }),
  beat_cluster_output_read_bytes_rate: new BeatsByteRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.read.bytes',
    title: throughputTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.throughput.bytesReceivedLabel', {
      defaultMessage: 'Bytes Received',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beats.throughput.bytesReceivedDescription',
      {
        defaultMessage: 'Bytes read in response from the output',
      }
    ),
  }),

  beat_cluster_pipeline_events_failed_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.failed',
    title: failRatesTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.failRates.failedInPipelineLabel', {
      defaultMessage: 'Failed in Pipeline',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beats.failRates.failedInPipelineDescription',
      {
        defaultMessage:
          'Failures that happened before event was added to the publishing pipeline (output was disabled or publisher client closed)',
      }
    ),
  }),
  beat_cluster_pipeline_events_dropped_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.dropped',
    title: failRatesTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.failRates.droppedInPipelineLabel', {
      defaultMessage: 'Dropped in Pipeline',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beats.failRates.droppedInPipelineDescription',
      {
        defaultMessage: 'Events that have been dropped after N retries (N = max_retries setting)',
      }
    ),
  }),
  beat_cluster_output_events_dropped_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.dropped',
    title: failRatesTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.failRates.droppedInOutputLabel', {
      defaultMessage: 'Dropped in Output',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beats.failRates.droppedInOutputDescription',
      {
        defaultMessage:
          '(Fatal drop) Events dropped by the output as being "invalid." The output still acknowledges the event ' +
          'for the Beat to remove it from the queue.',
      }
    ),
  }),
  beat_cluster_pipeline_events_retry_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.retry',
    title: failRatesTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.failRates.retryInPipelineLabel', {
      defaultMessage: 'Retry in Pipeline',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beats.failRates.retryInPipelineDescription',
      {
        defaultMessage: 'Events in the pipeline that are trying again to be sent to the output',
      }
    ),
  }),

  beat_cluster_output_sending_errors: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.write.errors',
    title: outputErrorsTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.outputErrors.sendingLabel', {
      defaultMessage: 'Sending',
    }),
    description: i18n.translate('xpack.monitoring.metrics.beats.outputErrors.sendingDescription', {
      defaultMessage: 'Errors in writing the response from the output',
    }),
  }),
  beat_cluster_output_receiving_errors: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.read.errors',
    title: outputErrorsTitle,
    label: i18n.translate('xpack.monitoring.metrics.beats.outputErrors.receivingLabel', {
      defaultMessage: 'Receiving',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beats.outputErrors.receivingDescription',
      {
        defaultMessage: 'Errors in reading the response from the output',
      }
    ),
  }),

  /*
   * Beat Detail
   */

  beat_pipeline_events_total_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.total',
    title: instanceEventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.eventsRate.newLabel', {
      defaultMessage: 'New',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.eventsRate.newDescription',
      {
        defaultMessage: 'New events sent to the publishing pipeline',
      }
    ),
  }),
  beat_output_events_total: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.events.total',
    title: instanceEventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.eventsRate.emittedLabel', {
      defaultMessage: 'Emitted',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.eventsRate.emittedDescription',
      {
        defaultMessage: 'Events processed by the output (including retries)',
      }
    ),
  }),
  beat_output_events_ack_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.events.acked',
    title: instanceEventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.eventsRate.acknowledgedLabel', {
      defaultMessage: 'Acknowledged',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.eventsRate.acknowledgedDescription',
      {
        defaultMessage: 'Events acknowledged by the output (includes events dropped by the output)',
      }
    ),
  }),
  beat_pipeline_events_emitted_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.published',
    title: instanceEventsRateTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.eventsRate.queuedLabel', {
      defaultMessage: 'Queued',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.eventsRate.queuedDescription',
      {
        defaultMessage: 'Events added to the event pipeline queue',
      }
    ),
  }),

  beat_pipeline_events_failed_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.failed',
    title: instanceFailRatesTitle,
    label: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.failRates.failedInPipelineLabel',
      {
        defaultMessage: 'Failed in Pipeline',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.failRates.failedInPipelineDescription',
      {
        defaultMessage:
          'Failures that happened before event was added to the publishing pipeline (output was disabled or publisher client closed)',
      }
    ),
  }),
  beat_pipeline_events_dropped_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.dropped',
    title: instanceFailRatesTitle,
    label: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.failRates.droppedInPipelineLabel',
      {
        defaultMessage: 'Dropped in Pipeline',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.failRates.droppedInPipelineDescription',
      {
        defaultMessage: 'Events that have been dropped after N retries (N = max_retries setting)',
      }
    ),
  }),
  beat_output_events_dropped_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.events.dropped',
    title: instanceFailRatesTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.failRates.droppedInOutputLabel', {
      defaultMessage: 'Dropped in Output',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.failRates.droppedInOutputDescription',
      {
        defaultMessage:
          '(Fatal drop) Events dropped by the output as being "invalid." The output ' +
          'still acknowledges the event for the Beat to remove it from the queue.',
      }
    ),
  }),
  beat_pipeline_events_retry_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.retry',
    title: instanceFailRatesTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.failRates.retryInPipelineLabel', {
      defaultMessage: 'Retry in Pipeline',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.failRates.retryInPipelineDescription',
      {
        defaultMessage: 'Events in the pipeline that are trying again to be sent to the output',
      }
    ),
  }),

  beat_bytes_written: new BeatsByteRateMetric({
    field: 'beats_stats.metrics.libbeat.output.write.bytes',
    title: instanceThroughputTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.throughput.bytesSentLabel', {
      defaultMessage: 'Bytes Sent',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.throughput.bytesSentDescription',
      {
        defaultMessage:
          'Bytes written to the output (consists of size of network headers and compressed payload)',
      }
    ),
  }),
  beat_output_write_bytes_rate: new BeatsByteRateMetric({
    field: 'beats_stats.metrics.libbeat.output.read.bytes',
    title: instanceThroughputTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.throughput.bytesReceivedLabel', {
      defaultMessage: 'Bytes Received',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.throughput.bytesReceivedDescription',
      {
        defaultMessage: 'Bytes read in response from the output',
      }
    ),
  }),

  beat_output_sending_errors: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.write.errors',
    title: instanceOutputErrorsTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.outputErrors.sendingLabel', {
      defaultMessage: 'Sending',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.outputErrors.sendingDescription',
      {
        defaultMessage: 'Errors in writing the response from the output',
      }
    ),
  }),
  beat_output_receiving_errors: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.read.errors',
    title: instanceOutputErrorsTitle,
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.outputErrors.receivingLabel', {
      defaultMessage: 'Receiving',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.outputErrors.receivingDescription',
      {
        defaultMessage: 'Errors in reading the response from the output',
      }
    ),
  }),

  beat_mem_alloc: new BeatsMetric({
    field: 'beats_stats.metrics.beat.memstats.memory_alloc',
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.memory.activeLabel', {
      defaultMessage: 'Active',
    }),
    title: instanceMemoryTitle,
    description: i18n.translate('xpack.monitoring.metrics.beatsInstance.memory.activeDescription', {
      defaultMessage: 'Private memory in active use by the Beat',
    }),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  beat_mem_rss: new BeatsMetric({
    field: 'beats_stats.metrics.beat.memstats.rss',
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.memory.processTotalLabel', {
      defaultMessage: 'Process Total',
    }),
    title: instanceMemoryTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.memory.processTotalDescription',
      {
        defaultMessage: 'Resident set size of memory reserved by the Beat from the OS',
      }
    ),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  beat_mem_gc_next: new BeatsMetric({
    field: 'beats_stats.metrics.beat.memstats.gc_next',
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.memory.gcNextLabel', {
      defaultMessage: 'GC Next',
    }),
    title: instanceMemoryTitle,
    description: i18n.translate('xpack.monitoring.metrics.beatsInstance.memory.gcNextDescription', {
      defaultMessage: 'Limit of allocated memory at which garbage collection will occur',
    }),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),

  beat_cpu_utilization: new BeatsCpuUtilizationMetric({
    title: i18n.translate('xpack.monitoring.metrics.beatsInstance.cpuUtilizationTitle', {
      defaultMessage: 'CPU Utilization',
    }),
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.cpuUtilization.totalLabel', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.cpuUtilization.totalDescription',
      {
        defaultMessage:
          'Percentage of CPU time spent executing (user+kernel mode) for the Beat process',
      }
    ),
    field: 'beats_stats.metrics.beat.cpu.total.value',
  }),

  beat_system_os_load_1: new BeatsMetric({
    field: 'beats_stats.metrics.system.load.1',
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.systemLoad.last1MinuteLabel', {
      defaultMessage: '1m',
    }),
    title: instanceSystemLoadTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.systemLoad.last1MinuteDescription',
      {
        defaultMessage: 'Load average over the last 1 minute',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  beat_system_os_load_5: new BeatsMetric({
    field: 'beats_stats.metrics.system.load.5',
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.systemLoad.last5MinutesLabel', {
      defaultMessage: '5m',
    }),
    title: instanceSystemLoadTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.systemLoad.last5MinutesDescription',
      {
        defaultMessage: 'Load average over the last 5 minutes',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  beat_system_os_load_15: new BeatsMetric({
    field: 'beats_stats.metrics.system.load.15',
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.systemLoad.last15MinutesLabel', {
      defaultMessage: '15m',
    }),
    title: instanceSystemLoadTitle,
    description: i18n.translate(
      'xpack.monitoring.metrics.beatsInstance.systemLoad.last15MinutesDescription',
      {
        defaultMessage: 'Load average over the last 15 minutes',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),

  beat_handles_open: new BeatsMetric({
    field: 'beats_stats.metrics.beat.handles.open',
    label: i18n.translate('xpack.monitoring.metrics.beatsInstance.openHandlesTitle', {
      defaultMessage: 'Open Handles',
    }),
    title: i18n.translate('xpack.monitoring.metrics.beatsInstance.openHandlesLabel', {
      defaultMessage: 'Open Handles',
    }),
    description: i18n.translate('xpack.monitoring.metrics.beatsInstance.openHandlesDescription', {
      defaultMessage: 'Count of open file handlers',
    }),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
};
