/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { last } from 'lodash';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Sparkline } from '../../../sparkline';
import { formatMetric } from '../../../../lib/format_number';
import { FormattedMessage } from '@kbn/i18n/react';

function renderIcon(vertex) {
  return <EuiIcon type={vertex.iconType} className="lspvDetailDrawerIcon" />;
}

function renderPluginBasicStats(vertex, timeseriesTooltipXValueFormatter) {
  const eventsLatencyValueFormatter = value => formatMetric(value, '0.[00]a', 'ms/e');
  const latestEventsLatency =
    Array.isArray(vertex.stats.millis_per_event.data) &&
    vertex.stats.millis_per_event.data.length > 0
      ? last(vertex.stats.millis_per_event.data)[1]
      : null;
  const eventsLatencyRow =
    vertex.pluginType === 'input' ? null : (
      <EuiTableRow key="events_latency">
        <EuiTableRowCell>
          <FormattedMessage
            id="xpack.monitoring.logstash.pipeline.detailDrawer.eventsLatencyLabel"
            defaultMessage="Events Latency"
          />
        </EuiTableRowCell>
        <EuiTableRowCell>
          <div className="lspvDetailDrawerSparklineContainer">
            <Sparkline
              series={vertex.stats.millis_per_event.data}
              options={{ xaxis: vertex.stats.millis_per_event.timeRange }}
              tooltip={{
                enabled: true,
                xValueFormatter: timeseriesTooltipXValueFormatter,
                yValueFormatter: eventsLatencyValueFormatter,
              }}
            />
          </div>
        </EuiTableRowCell>
        <EuiTableRowCell>{eventsLatencyValueFormatter(latestEventsLatency)}</EuiTableRowCell>
      </EuiTableRow>
    );

  const eventsOutRateValueFormatter = value => formatMetric(value, '0.[0]a', 'e/s');
  const eventsOutRateRow = (
    <EuiTableRow key="events_out_rate">
      <EuiTableRowCell>
        <FormattedMessage
          id="xpack.monitoring.logstash.pipeline.detailDrawer.eventsEmittedRateLabel"
          defaultMessage="Events Emitted Rate"
        />
      </EuiTableRowCell>
      <EuiTableRowCell>
        <div className="lspvDetailDrawerSparklineContainer">
          <Sparkline
            series={vertex.eventsPerSecond.data}
            options={{ xaxis: vertex.eventsPerSecond.timeRange }}
            tooltip={{
              enabled: true,
              xValueFormatter: timeseriesTooltipXValueFormatter,
              yValueFormatter: eventsOutRateValueFormatter,
            }}
          />
        </div>
      </EuiTableRowCell>
      <EuiTableRowCell>{eventsOutRateValueFormatter(vertex.latestEventsPerSecond)}</EuiTableRowCell>
    </EuiTableRow>
  );

  const eventsInValueFormatter = value => formatMetric(value, '0a', 'events');
  const latestEventsIn =
    Array.isArray(vertex.stats.events_in.data) && vertex.stats.events_in.data.length > 0
      ? last(vertex.stats.events_in.data)[1]
      : null;

  const eventsInRow =
    vertex.pluginType === 'input' ? null : (
      <EuiTableRow key="events_in">
        <EuiTableRowCell>
          <FormattedMessage
            id="xpack.monitoring.logstash.pipeline.detailDrawer.eventsReceivedLabel"
            defaultMessage="Events Received"
          />
        </EuiTableRowCell>
        <EuiTableRowCell>
          <div className="lspvDetailDrawerSparklineContainer">
            <Sparkline
              series={vertex.stats.events_in.data}
              options={{ xaxis: vertex.stats.events_in.timeRange }}
              tooltip={{
                enabled: true,
                xValueFormatter: timeseriesTooltipXValueFormatter,
                yValueFormatter: eventsInValueFormatter,
              }}
            />
          </div>
        </EuiTableRowCell>
        <EuiTableRowCell>{eventsInValueFormatter(latestEventsIn)}</EuiTableRowCell>
      </EuiTableRow>
    );

  const eventsOutValueFormatter = eventsInValueFormatter;
  const latestEventsOut =
    Array.isArray(vertex.stats.events_out.data) && vertex.stats.events_out.data.length > 0
      ? last(vertex.stats.events_out.data)[1]
      : null;
  const eventsOutRow = (
    <EuiTableRow key="events_out">
      <EuiTableRowCell>
        <FormattedMessage
          id="xpack.monitoring.logstash.pipeline.detailDrawer.eventsEmittedLabel"
          defaultMessage="Events Emitted"
        />
      </EuiTableRowCell>
      <EuiTableRowCell>
        <div className="lspvDetailDrawerSparklineContainer">
          <Sparkline
            series={vertex.stats.events_out.data}
            options={{ xaxis: vertex.stats.events_out.timeRange }}
            tooltip={{
              enabled: true,
              xValueFormatter: timeseriesTooltipXValueFormatter,
              yValueFormatter: eventsOutValueFormatter,
            }}
          />
        </div>
      </EuiTableRowCell>
      <EuiTableRowCell>{eventsOutValueFormatter(latestEventsOut)}</EuiTableRowCell>
    </EuiTableRow>
  );

  return (
    <EuiTable>
      <EuiTableBody>
        {eventsLatencyRow}
        {eventsOutRateRow}
        {eventsInRow}
        {eventsOutRow}
      </EuiTableBody>
    </EuiTable>
  );
}

function renderIfBasicStats() {
  return (
    <p>
      <FormattedMessage
        id="xpack.monitoring.logstash.pipeline.detailDrawer.noMetricsForIfDescription"
        defaultMessage="There are currently no metrics to show for this if condition."
      />
    </p>
  );
}

function renderQueueBasicStats() {
  return (
    <p>
      <FormattedMessage
        id="xpack.monitoring.logstash.pipeline.detailDrawer.noMetricsForQueueDescription"
        defaultMessage="There are currently no metrics to show for the queue."
      />
    </p>
  );
}

function renderBasicStats(vertex, timeseriesTooltipXValueFormatter) {
  switch (vertex.typeString) {
    case 'plugin':
      return renderPluginBasicStats(vertex, timeseriesTooltipXValueFormatter);
      break;
    case 'if':
      return renderIfBasicStats(vertex, timeseriesTooltipXValueFormatter);
      break;
    case 'queue':
      return renderQueueBasicStats(vertex, timeseriesTooltipXValueFormatter);
      break;
  }
}

function renderPluginBasicInfo(vertex) {
  if (vertex.hasExplicitId) {
    return (
      <p>
        <FormattedMessage
          id="xpack.monitoring.logstash.pipeline.detailDrawer.vertexIdDescription"
          defaultMessage="This {vertexType}&#39;s ID is {vertexId}."
          values={{ vertexType: vertex.typeString, vertexId: <EuiBadge>{vertex.id}</EuiBadge> }}
        />
      </p>
    );
  }

  return (
    <div>
      <p>
        <FormattedMessage
          id="xpack.monitoring.logstash.pipeline.detailDrawer.specifyVertexIdDescription"
          defaultMessage="This {vertexType} does not have an ID explicitly specified. Specifying an ID allows you to track differences
          across pipeline changes. You can explicitly specify an ID for this plugin like so:"
          values={{ vertexType: vertex.typeString }}
        />
      </p>
      <EuiCodeBlock>
        {vertex.name}{' '}
        {`{
  id => "mySpecialId"
}`}
      </EuiCodeBlock>
      <EuiSpacer />
    </div>
  );
}

function renderIfBasicInfo(vertex) {
  const ifCode = `if (${vertex.subtitle}) {
  ...
}`;

  return (
    <div>
      <p>
        <FormattedMessage
          id="xpack.monitoring.logstash.pipeline.detailDrawer.conditionalStatementDescription"
          defaultMessage="This is a conditional statement in your pipeline."
        />
      </p>
      <EuiCodeBlock>{ifCode}</EuiCodeBlock>
      <EuiSpacer />
    </div>
  );
}

function renderQueueBasicInfo() {
  return (
    <p>
      <FormattedMessage
        id="xpack.monitoring.logstash.pipeline.detailDrawer.structureDescription"
        defaultMessage="This is an internal structure used by Logstash to buffer events between
        inputs and the rest of the pipeline."
      />
    </p>
  );
}

function renderBasicInfo(vertex) {
  switch (vertex.typeString) {
    case 'plugin':
      return renderPluginBasicInfo(vertex);
      break;
    case 'if':
      return renderIfBasicInfo(vertex);
      break;
    case 'queue':
      return renderQueueBasicInfo(vertex);
      break;
  }
}

function renderTitle(vertex) {
  switch (vertex.typeString) {
    case 'plugin':
      return `${vertex.title} ${vertex.pluginType}`;
      break;
    case 'if':
    case 'queue':
      return vertex.title;
      break;
  }
}

export function DetailDrawer({ vertex, onHide, timeseriesTooltipXValueFormatter }) {
  return (
    <EuiFlyout size="s" onClose={onHide}>
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="baseline" gutterSize="s">
          <EuiFlexItem grow={false}>{renderIcon(vertex)}</EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle>
              <h2>{renderTitle(vertex)}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          {renderBasicInfo(vertex)}
          {renderBasicStats(vertex, timeseriesTooltipXValueFormatter)}
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
