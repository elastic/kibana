/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { AwsFlyout } from './aws_flyout';
import integrationsHeaderImg from './assets/integrations-header.png';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCard,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPopover,
  EuiSelectable,
  EuiSideNav,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';

// ─── Logo constants (copied from ingest_hub_components.tsx) ──────────────────

const COMPACT_LOGO_SIZE = 20;
const COMPACT_LOGO_BG_PADDING = 6;
const CARD_LOGO_SIZE = 24;
const CARD_LOGO_BG_PADDING = 8;
const CARD_PADDING_PX = 16;

const ELASTIC_LOGOS =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages';
const LOGO_FALLBACK = 'https://www.vectorlogo.zone/logos';

// ─── Shared logo components (exact copies from ingest_hub_components.tsx) ────

export const CompactLogoIcon: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const { euiTheme } = useEuiTheme();
  const [errored, setErrored] = useState(false);
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    height: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderRadius: 8,
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    flexShrink: 0,
  };
  return (
    <div style={style}>
      {errored ? (
        <EuiIcon type="logoElastic" size="s" color="text" />
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ width: COMPACT_LOGO_SIZE, height: COMPACT_LOGO_SIZE, objectFit: 'contain' }}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
};

export const CardLogoIcon: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const { euiTheme } = useEuiTheme();
  const [errored, setErrored] = useState(false);
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: CARD_LOGO_SIZE + CARD_LOGO_BG_PADDING * 2,
    height: CARD_LOGO_SIZE + CARD_LOGO_BG_PADDING * 2,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderRadius: 12,
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
  };
  return (
    <div style={style}>
      {errored ? (
        <EuiIcon type="logoElastic" size="m" color="text" />
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ width: CARD_LOGO_SIZE, height: CARD_LOGO_SIZE, objectFit: 'contain' }}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
};

const CompactIntegrationCard: React.FC<{
  name: string;
  description?: string;
  logoUrl?: string;
  logoDomain: string;
  badge?: string;
  onClick?: () => void;
}> = ({ name, description, badge, logoUrl, onClick }) => {
  const { euiTheme } = useEuiTheme();
  const titleContent = badge ? (
    <span css={css`display: flex; align-items: center; gap: 8px;`}>
      {name}
      <EuiBadge
        color="default"
        css={css`font-size:10px;line-height:1;padding:0 4px;height:18px;.euiBadge__content{padding:0;}.euiBadge__text{padding:0;}`}
      >
        {badge}
      </EuiBadge>
    </span>
  ) : (
    name
  );
  return (
    <EuiCard
      title={titleContent}
      titleElement="h4"
      titleSize="xs"
      description=""
      icon={<CompactLogoIcon src={logoUrl ?? ''} alt={`${name} logo`} />}
      layout="horizontal"
      hasBorder
      paddingSize="none"
      onClick={onClick}
      css={css`
        border-radius: 6px;
        padding: 12px;
        height: 100%;
        cursor: pointer;
        .euiCard__top { min-width:0; flex-shrink:0; margin-block-end:0 !important; margin-inline-end:12px !important; }
        .euiCard__content { min-width:0; overflow:hidden; }
        .euiCard__main { min-width:0; overflow:hidden; }
        .euiCard__content, .euiCard__children { margin-bottom:0; padding-bottom:0; }
        .euiCard__title { min-width:0; overflow:hidden; font-family:${euiTheme.font.family}; font-weight:${euiTheme.font.weight.bold}; color:${euiTheme.colors.text}; }
        .euiCard__title h4 { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .euiCard__description { display:none; }
      `}
    >
      <EuiText
        size="xs"
        color="subdued"
        css={css`display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.4em;`}
      >
        {description || '\u00A0'}
      </EuiText>
    </EuiCard>
  );
};

const IntegrationCard: React.FC<{
  name: string;
  description?: string;
  logoDomain: string;
  logoUrl?: string;
  badge?: string;
  onClick?: () => void;
}> = ({ name, description, logoUrl, badge, onClick }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {badge && (
        <EuiBadge
          color="hollow"
          css={css`position:absolute;top:8px;left:8px;z-index:1;`}
        >
          {badge}
        </EuiBadge>
      )}
      <EuiCard
        title={name}
        titleElement="h4"
        titleSize="xs"
        description={description ? undefined : ''}
        icon={<CardLogoIcon src={logoUrl ?? ''} alt={`${name} logo`} />}
        layout="vertical"
        hasBorder
        paddingSize="none"
        onClick={onClick}
        css={css`
          border-radius:6px;
          box-shadow:${euiTheme.shadows.s};
          padding:${CARD_PADDING_PX}px;
          ${badge ? `padding-top:${CARD_PADDING_PX + 24}px;` : ''}
          height:100%;
          overflow:visible;
          cursor:pointer;
          transition:box-shadow 150ms ease-in;
          &:hover, &:focus { box-shadow:${euiTheme.shadows.m}; }
          .euiCard__top { display:flex; justify-content:center; margin-bottom:12px; }
          .euiCard__content { text-align:center; min-width:0; }
          .euiCard__content, .euiCard__children { margin-bottom:0; padding-bottom:0; }
          .euiCard__title { font-family:${euiTheme.font.family}; font-weight:${euiTheme.font.weight.bold}; color:${euiTheme.colors.text}; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        `}
      >
        <EuiText
          size="s"
          color="subdued"
          style={{ marginTop: 4, marginBottom: 0 }}
          css={css`min-height:2.8em;p{margin-bottom:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}`}
        >
          {description || '\u00A0'}
        </EuiText>
      </EuiCard>
    </div>
  );
};

// ─── Data (copied from ingest_hub_data.ts) ───────────────────────────────────

interface IntegrationTile {
  id: string;
  name: string;
  description: string;
  logoDomain: string;
  logoUrl?: string;
}

interface TaggedTile extends IntegrationTile {
  badge?: string;
}

interface IntegrationSection {
  title: string;
  description: string;
  tiles: IntegrationTile[];
}

const SECTIONS: IntegrationSection[] = [
  {
    title: 'Cloud',
    description: 'Monitor your cloud infrastructure',
    tiles: [
      { id: 'aws', name: 'Amazon Web Services', description: 'Collect logs and metrics from AWS services.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_aws.svg` },
      { id: 'gcp', name: 'Google Cloud Platform', description: 'Monitor Google Cloud operations and resources.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
      { id: 'azure', name: 'Azure', description: 'Centralize Azure monitoring and alerting.', logoDomain: 'azure.microsoft.com', logoUrl: `${ELASTIC_LOGOS}/azure/img/logo_azure.svg` },
    ],
  },
  {
    title: 'Containers',
    description: 'Monitor your containerised environments',
    tiles: [
      { id: 'kubernetes', name: 'Kubernetes', description: 'Monitor pod health, resources, and deployments.', logoDomain: 'kubernetes.io', logoUrl: `${ELASTIC_LOGOS}/kubernetes/img/logo_kubernetes.svg` },
      { id: 'docker', name: 'Docker', description: 'Collect container logs and metrics.', logoDomain: 'docker.com', logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg` },
      { id: 'ecs', name: 'Amazon ECS', description: 'Track ECS and Fargate task metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ecs.svg` },
    ],
  },
  {
    title: 'Host',
    description: 'Monitor your physical or virtual servers',
    tiles: [
      { id: 'linux', name: 'Linux', description: 'Collect system metrics and logs from Linux servers.', logoDomain: 'linuxfoundation.org', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg' },
      { id: 'windows', name: 'Windows', description: 'Monitor event logs and performance counters.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/windows/img/logo_windows.svg` },
      { id: 'macos', name: 'macOS', description: 'Collect logs and metrics from macOS endpoints.', logoDomain: 'apple.com', logoUrl: `${ELASTIC_LOGOS}/macos/img/macos-logo.svg` },
    ],
  },
  {
    title: 'Applications',
    description: 'Monitor your application performance and logs',
    tiles: [
      { id: 'opentelemetry', name: 'OpenTelemetry', description: 'Send traces, metrics, and logs via OTel SDK.', logoDomain: 'opentelemetry.io', logoUrl: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png' },
      { id: 'prometheus', name: 'Prometheus', description: 'Scrape and visualize Prometheus metrics.', logoDomain: 'prometheus.io', logoUrl: `${ELASTIC_LOGOS}/prometheus/img/logo_prometheus.svg` },
      { id: 'fluentbit', name: 'Fluent Bit', description: 'Forward logs from any source via Fluent Bit.', logoDomain: 'fluentbit.io', logoUrl: `${LOGO_FALLBACK}/fluentd/fluentd-icon.svg` },
    ],
  },
];

const SAAS_TILES: IntegrationTile[] = [
  { id: 'confluence', name: 'Confluence', description: 'Index and search Confluence spaces, pages, and blog posts.', logoDomain: 'atlassian.com', logoUrl: `${ELASTIC_LOGOS}/atlassian_confluence/img/confluence-logo.svg` },
  { id: 'salesforce', name: 'Salesforce', description: 'Collect Salesforce events, objects, and login activity.', logoDomain: 'salesforce.com', logoUrl: `${ELASTIC_LOGOS}/salesforce/img/salesforce.svg` },
  { id: 'slack', name: 'Slack', description: 'Monitor Slack workspace audit logs and messages.', logoDomain: 'slack.com', logoUrl: `${ELASTIC_LOGOS}/slack/img/slack.svg` },
];

const ALL_INTEGRATIONS: IntegrationTile[] = [
  { id: 'activemq', name: 'ActiveMQ', description: 'Collect ActiveMQ logs and metrics.', logoDomain: 'activemq.apache.org', logoUrl: `${ELASTIC_LOGOS}/activemq/img/logo_activemq.svg` },
  { id: 'amazon_bedrock', name: 'Amazon Bedrock', description: 'Track Bedrock model invocations and metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws_bedrock/img/logo_bedrock.svg` },
  { id: 'amazon_cloudfront', name: 'Amazon CloudFront', description: 'Collect CloudFront access logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudfront.svg` },
  { id: 'amazon_dynamodb', name: 'Amazon DynamoDB', description: 'Collect DynamoDB table metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_dynamodb.svg` },
  { id: 'amazon_ec2', name: 'Amazon EC2', description: 'Collect EC2 instance logs and metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ec2.svg` },
  { id: 'amazon_ecs', name: 'Amazon ECS', description: 'Monitor ECS container service metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ecs.svg` },
  { id: 'amazon_guardduty', name: 'Amazon GuardDuty', description: 'Ingest GuardDuty threat findings.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_guardduty.svg` },
  { id: 'amazon_rds', name: 'Amazon RDS', description: 'Collect RDS database metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_rds.svg` },
  { id: 'amazon_s3', name: 'Amazon S3', description: 'Monitor S3 bucket metrics and access logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg` },
  { id: 'amazon_vpc_flow', name: 'Amazon VPC Flow Logs', description: 'Collect VPC network flow logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_vpcflow.svg` },
  { id: 'apache', name: 'Apache HTTP Server', description: 'Monitor Apache server logs and metrics.', logoDomain: 'httpd.apache.org', logoUrl: `${ELASTIC_LOGOS}/apache/img/logo_apache.svg` },
  { id: 'apm', name: 'APM', description: 'Monitor app performance with traces and metrics.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/apm/img/logo_apm.svg` },
  { id: 'azure_monitor', name: 'Azure Monitor', description: 'Collect Azure Monitor metrics and logs.', logoDomain: 'azure.microsoft.com', logoUrl: `${ELASTIC_LOGOS}/azure/img/logo_azure.svg` },
  { id: 'cassandra', name: 'Cassandra', description: 'Collect Cassandra logs and metrics.', logoDomain: 'cassandra.apache.org', logoUrl: `${ELASTIC_LOGOS}/cassandra/img/logo_cassandra.svg` },
  { id: 'docker-int', name: 'Docker', description: 'Collect container logs and metrics.', logoDomain: 'docker.com', logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg` },
  { id: 'elasticsearch-int', name: 'Elasticsearch', description: 'Monitor Elasticsearch cluster health.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/elasticsearch/img/logo_elasticsearch.svg` },
  { id: 'gcp_pubsub', name: 'Google Cloud Pub/Sub', description: 'Monitor Pub/Sub topic metrics.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'gcp_compute', name: 'Google Compute Engine', description: 'Collect Compute Engine instance metrics.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'haproxy', name: 'HAProxy', description: 'Monitor HAProxy load balancer metrics.', logoDomain: 'haproxy.org', logoUrl: `${ELASTIC_LOGOS}/haproxy/img/logo_haproxy.svg` },
  { id: 'iis', name: 'IIS', description: 'Collect IIS web server logs and metrics.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/iis/img/logo_iis.svg` },
  { id: 'kafka', name: 'Kafka', description: 'Monitor Kafka broker logs and metrics.', logoDomain: 'kafka.apache.org', logoUrl: `${ELASTIC_LOGOS}/kafka/img/logo_kafka.svg` },
  { id: 'kubernetes-int', name: 'Kubernetes', description: 'Monitor clusters, pods, and deployments.', logoDomain: 'kubernetes.io', logoUrl: `${ELASTIC_LOGOS}/kubernetes/img/logo_kubernetes.svg` },
  { id: 'mongodb', name: 'MongoDB', description: 'Monitor MongoDB database metrics.', logoDomain: 'mongodb.com', logoUrl: `${ELASTIC_LOGOS}/mongodb/img/logo_mongodb.svg` },
  { id: 'mysql-int', name: 'MySQL', description: 'Collect MySQL database logs and metrics.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'nginx', name: 'Nginx', description: 'Monitor Nginx server logs and metrics.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg` },
  { id: 'opentelemetry-int', name: 'OpenTelemetry', description: 'Send traces, metrics, and logs via OTel.', logoDomain: 'opentelemetry.io', logoUrl: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png' },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Collect PostgreSQL database metrics.', logoDomain: 'postgresql.org', logoUrl: `${ELASTIC_LOGOS}/postgresql/img/logo_postgresql.svg` },
  { id: 'prometheus-int', name: 'Prometheus', description: 'Scrape and visualize Prometheus metrics.', logoDomain: 'prometheus.io', logoUrl: `${ELASTIC_LOGOS}/prometheus/img/logo_prometheus.svg` },
  { id: 'rabbitmq', name: 'RabbitMQ', description: 'Monitor RabbitMQ queue metrics.', logoDomain: 'rabbitmq.com', logoUrl: `${ELASTIC_LOGOS}/rabbitmq/img/logo_rabbitmq.svg` },
  { id: 'redis', name: 'Redis', description: 'Collect Redis server metrics.', logoDomain: 'redis.io', logoUrl: `${ELASTIC_LOGOS}/redis/img/logo_redis.svg` },
  { id: 'system', name: 'System', description: 'Monitor host CPU, memory, and processes.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/system/img/logo_system.svg` },
  { id: 'zookeeper', name: 'ZooKeeper', description: 'Monitor ZooKeeper ensemble metrics.', logoDomain: 'zookeeper.apache.org', logoUrl: `${ELASTIC_LOGOS}/zookeeper/img/logo_zookeeper.svg` },
];

const PACKAGES: IntegrationTile[] = [
  { id: 'pkg-apache-otel', name: 'Apache HTTP Server', description: 'Collect Apache HTTP Server status metrics using OpenTelemetry Collector.', logoDomain: 'httpd.apache.org', logoUrl: `${ELASTIC_LOGOS}/apache/img/logo_apache.svg` },
  { id: 'pkg-custom-wmi', name: 'Custom WMI', description: 'Custom WMI Input Package.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/windows/img/logo_windows.svg` },
  { id: 'pkg-docker-otel', name: 'Docker', description: 'Collect Docker container metrics using OpenTelemetry Collector.', logoDomain: 'docker.com', logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg` },
  { id: 'pkg-host-metrics-otel', name: 'Host Metrics', description: 'Collect system metrics using OpenTelemetry Collector.', logoDomain: 'opentelemetry.io', logoUrl: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png' },
  { id: 'pkg-mysql-otel', name: 'MySQL', description: 'Collect MySQL metrics using OpenTelemetry Collector.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'pkg-nginx-otel', name: 'NGINX', description: 'NGINX OpenTelemetry Input Package.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg` },
  { id: 'pkg-redis-otel', name: 'Redis', description: 'Redis OpenTelemetry Input Package.', logoDomain: 'redis.io', logoUrl: `${ELASTIC_LOGOS}/redis/img/logo_redis.svg` },
  { id: 'pkg-statsd', name: 'StatsD', description: 'StatsD Input Package.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/statsd/img/logo_statsd.svg` },
];

const ASSET_TILES: IntegrationTile[] = [
  { id: 'asset-apache-otel', name: 'Apache', description: 'Apache status metrics from OpenTelemetry Collector.', logoDomain: 'httpd.apache.org', logoUrl: `${ELASTIC_LOGOS}/apache/img/logo_apache.svg` },
  { id: 'asset-aws-cloudtrail-otel', name: 'AWS CloudTrail', description: 'AWS CloudTrail Logs OpenTelemetry Assets.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudtrail.svg` },
  { id: 'asset-aws-elb-otel', name: 'AWS ELB', description: 'AWS ELB logs for OpenTelemetry Collector.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_elb.svg` },
  { id: 'asset-aws-vpc-otel', name: 'AWS VPC Flow Logs', description: 'AWS VPC Flow Logs OpenTelemetry Assets.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_vpcflow.svg` },
  { id: 'asset-docker-otel', name: 'Docker', description: 'Pre-built dashboard for OTel-native metrics of Docker hosts.', logoDomain: 'docker.com', logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg` },
  { id: 'asset-k8s-otel', name: 'Kubernetes', description: 'Pre-built dashboard for OTel-native metrics from a Kubernetes cluster.', logoDomain: 'kubernetes.io', logoUrl: `${ELASTIC_LOGOS}/kubernetes/img/logo_kubernetes.svg` },
  { id: 'asset-mysql-otel', name: 'MySQL', description: 'MySQL metrics for OpenTelemetry Collector.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'asset-nginx-otel', name: 'NGINX', description: 'NGINX metrics from OpenTelemetry Collector.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg` },
  { id: 'asset-system-otel', name: 'System', description: 'Dashboards for the OpenTelemetry data collected with the hostmetrics receiver.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/system/img/logo_system.svg` },
];

const CONNECTOR_TILES: IntegrationTile[] = [
  { id: 'conn-s3', name: 'Amazon S3', description: 'Use a connector to sync from your Amazon S3 data source.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg` },
  { id: 'conn-azure-blob', name: 'Azure Blob Storage', description: 'Use a connector to sync from your Azure Blob Storage data source.', logoDomain: 'azure.microsoft.com', logoUrl: `${ELASTIC_LOGOS}/azure/img/logo_azure.svg` },
  { id: 'conn-confluence', name: 'Confluence', description: 'Use a connector to sync from your Confluence data source.', logoDomain: 'atlassian.com', logoUrl: `${ELASTIC_LOGOS}/atlassian_confluence/img/confluence-logo.svg` },
  { id: 'conn-github', name: 'GitHub', description: 'Use a connector to sync data from your GitHub data source.', logoDomain: 'github.com', logoUrl: `${ELASTIC_LOGOS}/github/img/logo_github.svg` },
  { id: 'conn-gcs', name: 'Google Cloud Storage', description: 'Use a connector to sync from your Google Cloud Storage data source.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'conn-jira', name: 'Jira', description: 'Use a connector to sync from your Jira data source.', logoDomain: 'atlassian.com', logoUrl: `${ELASTIC_LOGOS}/atlassian_jira/img/jira-logo.svg` },
  { id: 'conn-mongodb', name: 'MongoDB', description: 'Use a connector to sync from your MongoDB data source.', logoDomain: 'mongodb.com', logoUrl: `${ELASTIC_LOGOS}/mongodb/img/logo_mongodb.svg` },
  { id: 'conn-mysql', name: 'MySQL', description: 'Use a connector to sync from your MySQL data source.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'conn-postgresql', name: 'PostgreSQL', description: 'Use a connector to sync from your PostgreSQL data source.', logoDomain: 'postgresql.org', logoUrl: `${ELASTIC_LOGOS}/postgresql/img/logo_postgresql.svg` },
  { id: 'conn-salesforce', name: 'Salesforce', description: 'Use a connector to sync from your Salesforce data source.', logoDomain: 'salesforce.com', logoUrl: `${ELASTIC_LOGOS}/salesforce/img/salesforce.svg` },
  { id: 'conn-slack', name: 'Slack', description: 'Use a connector to sync from your Slack data source.', logoDomain: 'slack.com', logoUrl: `${ELASTIC_LOGOS}/slack/img/slack.svg` },
];

const API_INGESTION_TILES: IntegrationTile[] = [
  { id: 'api-apm', name: 'APM', description: 'Send application performance data, traces, and errors using APM agents or OpenTelemetry.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/apm/img/logo_apm.svg` },
  { id: 'api-elasticsearch', name: 'Elasticsearch', description: 'Index and query observability data directly using the Elasticsearch API or bulk ingestion.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/elasticsearch/img/logo_elasticsearch.svg` },
  { id: 'api-kibana', name: 'Kibana', description: 'Access Kibana programmatically or embed dashboards using the Kibana API.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/kibana/img/logo_kibana.svg` },
  { id: 'api-ingest', name: 'Ingest', description: 'Send data from Beats, Logstash, or Fleet-managed agents to your Elastic deployment.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/elastic/img/logo_elastic.svg` },
];

const INTEGRATION_CATEGORIES = ['AWS', 'Azure', 'Cloud', 'Containers', 'Database', 'Elastic Stack', 'Google Cloud', 'Network', 'OpenTelemetry', 'Operating Systems', 'Application', 'Kubernetes', 'Message Broker', 'Web Server'];
const PACKAGE_CATEGORIES = ['OpenTelemetry', 'StatsD', 'Custom', 'Web Server', 'Database', 'Containers', 'System'];
const ASSET_CATEGORIES = ['OpenTelemetry', 'AWS', 'GCP', 'Containers', 'Web Server', 'Database', 'System'];
const CONNECTOR_CATEGORIES = ['Cloud storage', 'Database', 'SaaS', 'Productivity', 'Communication', 'Developer tools'];

// ─── Main Flyout ─────────────────────────────────────────────────────────────

export function DataSourcesCatalogFlyout({
  onClose,
  onDataConnected,
}: {
  onClose: () => void;
  onDataConnected: () => void;
}) {
  const { euiTheme } = useEuiTheme();

  // Search & filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [setupOptions, setSetupOptions] = useState([
    { label: 'Agentless', checked: undefined as 'on' | undefined },
    { label: 'Elastic Agent', checked: undefined as 'on' | undefined },
    { label: 'Beats', checked: undefined as 'on' | undefined },
  ]);
  const [signalsOptions, setSignalsOptions] = useState([
    { label: 'Logs', checked: undefined as 'on' | undefined },
    { label: 'Metrics', checked: undefined as 'on' | undefined },
  ]);
  const [statusOptions, setStatusOptions] = useState([
    { label: 'Beta', checked: undefined as 'on' | undefined },
    { label: 'Deprecated', checked: undefined as 'on' | undefined },
  ]);
  const [sortOptions, setSortOptions] = useState([
    { label: 'Name (A\u2013Z)', checked: 'on' as 'on' | undefined },
    { label: 'Name (Z\u2013A)', checked: undefined as 'on' | undefined },
    { label: 'Recently added', checked: undefined as 'on' | undefined },
  ]);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSignalsOpen, setIsSignalsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedTile, setSelectedTile] = useState<IntegrationTile | null>(null);

  const handleTileClick = useCallback((tile: IntegrationTile) => {
    setSelectedTile(tile);
  }, []);

  const sideNavCss = css`
    overflow: hidden;
    .euiSideNavItemButton__label { text-overflow: initial; }
  `;

  // ── renderCompactGrid ──────────────────────────────────────────────────────

  const renderCompactGrid = (tiles: IntegrationTile[], cols: number = 3) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
      }}
    >
      {tiles.map((tile) => (
        <CompactIntegrationCard
          key={tile.id}
          name={tile.name}
          description={tile.description}
          logoUrl={tile.logoUrl}
          logoDomain={tile.logoDomain}
          onClick={() => handleTileClick(tile)}
        />
      ))}
    </div>
  );

  // ── renderAddDataRecommendedContent (exact copy of IngestHub) ─────────────

  const renderRecommendedContent = () => (
    <>
      <EuiTitle size="xs"><h2>Recommendations</h2></EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>Curated groups to help you find the right data sources for your environment. Open a category to browse the full catalogue.</p>
      </EuiText>
      <EuiSpacer size="xxl" />
      {SECTIONS.map((section, idx) => {
        const categoryMap: Record<string, string> = { Cloud: 'Cloud', Containers: 'Containers', Host: 'Operating Systems', Applications: 'Application' };
        const integrationCategory = categoryMap[section.title] || section.title;
        return (
          <React.Fragment key={section.title}>
            {idx > 0 && <div style={{ height: 40 }} />}
            <EuiFlexGroup alignItems="baseline" gutterSize="xs" responsive={false} wrap={false}>
              <EuiFlexItem grow={false} css={css`min-width:0;`}>
                <EuiText size="s" color="subdued">
                  <p style={{ margin: 0, display: 'inline' }}>{section.description}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  flush="left"
                  iconType="arrowRight"
                  iconSide="right"
                  css={css`& .euiButtonEmpty__content { gap: 0; }`}
                  onClick={() => setSelectedCategory(`integration:${integrationCategory}`)}
                >
                  View all
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div style={{ height: 8 }} />
            {renderCompactGrid(section.tiles)}
          </React.Fragment>
        );
      })}
      {SAAS_TILES.length > 0 && (
        <>
          <div style={{ height: 40 }} />
          <EuiFlexGroup alignItems="baseline" gutterSize="xs" responsive={false} wrap={false}>
            <EuiFlexItem grow={false} css={css`min-width:0;`}>
              <EuiText size="s" color="subdued">
                <p style={{ margin: 0, display: 'inline' }}>Monitor your cloud resources without installing an agent.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="left"
                iconType="arrowRight"
                iconSide="right"
                css={css`& .euiButtonEmpty__content { gap: 0; }`}
                onClick={() => setSetupOptions((prev) => prev.map((o) => ({ ...o, checked: o.label === 'Agentless' ? ('on' as const) : undefined })))}
              >
                View all
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <div style={{ height: 8 }} />
          {renderCompactGrid(SAAS_TILES)}
        </>
      )}
      <div style={{ height: 64 }} />
    </>
  );

  // ── Filter toolbar ─────────────────────────────────────────────────────────

  const renderFilterToolbar = () => (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false} style={{ marginBottom: 32 }}>
      <EuiFlexItem>
        <EuiFieldSearch
          placeholder="Search all..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          compressed
          aria-label="Search all integrations"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                grow={false}
                onClick={() => setIsSetupOpen(!isSetupOpen)}
                isSelected={isSetupOpen}
                hasActiveFilters={setupOptions.some((o) => o.checked === 'on')}
                numActiveFilters={setupOptions.filter((o) => o.checked === 'on').length}
              >
                Setup method
              </EuiFilterButton>
            }
            isOpen={isSetupOpen}
            closePopover={() => setIsSetupOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable options={setupOptions} onChange={(opts) => setSetupOptions(opts as typeof setupOptions)}>
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                grow={false}
                onClick={() => setIsSignalsOpen(!isSignalsOpen)}
                isSelected={isSignalsOpen}
                hasActiveFilters={signalsOptions.some((o) => o.checked === 'on')}
                numActiveFilters={signalsOptions.filter((o) => o.checked === 'on').length}
              >
                All signals
              </EuiFilterButton>
            }
            isOpen={isSignalsOpen}
            closePopover={() => setIsSignalsOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable options={signalsOptions} onChange={(opts) => setSignalsOptions(opts as typeof signalsOptions)}>
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                grow={false}
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                isSelected={isStatusOpen}
                hasActiveFilters={statusOptions.some((o) => o.checked === 'on')}
                numActiveFilters={statusOptions.filter((o) => o.checked === 'on').length}
              >
                Status
              </EuiFilterButton>
            }
            isOpen={isStatusOpen}
            closePopover={() => setIsStatusOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable options={statusOptions} onChange={(opts) => setStatusOptions(opts as typeof statusOptions)}>
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                grow={false}
                onClick={() => setIsSortOpen(!isSortOpen)}
                isSelected={isSortOpen}
              >
                {sortOptions.find((o) => o.checked === 'on')?.label ?? 'Sort'}
              </EuiFilterButton>
            }
            isOpen={isSortOpen}
            closePopover={() => setIsSortOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiSelectable
              singleSelection
              options={sortOptions}
              onChange={(opts) => { setSortOptions(opts as typeof sortOptions); setIsSortOpen(false); }}
            >
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  // ── Browse-all catalogue (used when a category is selected or searching) ──

  const renderCatalogueGrid = () => {
    const rawQ = search.trim().toLowerCase();
    const sectionKey = selectedCategory.split(':')[0] ?? '';
    const catValue = selectedCategory.split(':').slice(1).join(':') || '';

    const buildAll = (): TaggedTile[] => [
      ...ALL_INTEGRATIONS.map((t) => ({ ...t, badge: 'Integration' as string | undefined })),
      ...PACKAGES.map((t) => ({ ...t, badge: 'Input package' as string | undefined })),
      ...ASSET_TILES.map((t) => ({ ...t, badge: 'Asset' as string | undefined })),
      ...CONNECTOR_TILES.map((t) => ({ ...t, badge: 'Connector' as string | undefined })),
      ...API_INGESTION_TILES.map((t) => ({ ...t, badge: 'API ingestion' as string | undefined })),
    ];

    const allItems = buildAll();

    const byCategory: TaggedTile[] =
      selectedCategory === 'all'
        ? allItems
        : sectionKey === 'integration'
        ? ALL_INTEGRATIONS.filter((t) => t.name.toLowerCase().includes(catValue.toLowerCase()) || t.logoDomain.toLowerCase().includes(catValue.toLowerCase())).map((t) => ({ ...t, badge: 'Integration' as string | undefined }))
        : sectionKey === 'package'
        ? PACKAGES.map((t) => ({ ...t, badge: 'Input package' as string | undefined }))
        : sectionKey === 'asset'
        ? ASSET_TILES.filter((t) => t.name.toLowerCase().includes(catValue.toLowerCase())).map((t) => ({ ...t, badge: 'Asset' as string | undefined }))
        : sectionKey === 'connector'
        ? CONNECTOR_TILES.filter((t) => t.name.toLowerCase().includes(catValue.toLowerCase())).map((t) => ({ ...t, badge: 'Connector' as string | undefined }))
        : sectionKey === 'all-integrations'
        ? ALL_INTEGRATIONS.map((t) => ({ ...t, badge: 'Integration' as string | undefined }))
        : sectionKey === 'all-packages'
        ? PACKAGES.map((t) => ({ ...t, badge: 'Input package' as string | undefined }))
        : sectionKey === 'all-assets'
        ? ASSET_TILES.map((t) => ({ ...t, badge: 'Asset' as string | undefined }))
        : sectionKey === 'all-connectors'
        ? CONNECTOR_TILES.map((t) => ({ ...t, badge: 'Connector' as string | undefined }))
        : sectionKey === 'all-api-ingestion'
        ? API_INGESTION_TILES.map((t) => ({ ...t, badge: 'API ingestion' as string | undefined }))
        : allItems;

    const matched = rawQ
      ? allItems.filter((t) => t.name.toLowerCase().includes(rawQ) || (t.description?.toLowerCase().includes(rawQ) ?? false))
      : byCategory;

    const activeSort = sortOptions.find((o) => o.checked === 'on')?.label;
    const sorted = [...matched].sort((a, b) => {
      if (activeSort === 'Name (A\u2013Z)') return a.name.localeCompare(b.name);
      if (activeSort === 'Name (Z\u2013A)') return b.name.localeCompare(a.name);
      return 0;
    });

    const getHeader = () => {
      if (rawQ) return { title: 'Search results', description: 'Matches across integrations, input packages, assets, connectors, and API ingestion.' };
      if (selectedCategory === 'all-api-ingestion') return { title: 'API ingestion', description: 'Send data using APM, the Elasticsearch API, the Kibana API, or Beats, Logstash, and Fleet-managed agents.' };
      if (selectedCategory === 'all-integrations' || selectedCategory.startsWith('integration:')) return { title: 'All integrations', description: 'Browse Elastic integrations to collect logs, metrics, and traces from your stack.' };
      if (selectedCategory === 'all-packages' || selectedCategory.startsWith('package:')) return { title: 'All input packages', description: 'Input packages and collectors for OpenTelemetry, metrics, custom pipelines, and more.' };
      if (selectedCategory === 'all-assets' || selectedCategory.startsWith('asset:')) return { title: 'All assets', description: 'Pre-built dashboards and assets for OpenTelemetry, cloud, and infrastructure data.' };
      if (selectedCategory === 'all-connectors' || selectedCategory.startsWith('connector:')) return { title: 'All connectors', description: 'Connect external data sources—cloud storage, databases, SaaS, and productivity tools.' };
      return { title: 'All catalogue', description: 'Complete catalogue of integrations, input packages, assets, connectors, and API ingestion.' };
    };

    const { title: catTitle, description: catDesc } = getHeader();

    return (
      <>
        <EuiTitle size="xs"><h2>{catTitle}</h2></EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued"><p>{catDesc}</p></EuiText>
        <EuiSpacer size="xxl" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {sorted.map((tile) => (
            <IntegrationCard
              key={tile.id}
              name={tile.name}
              description={tile.description}
              logoDomain={tile.logoDomain}
              logoUrl={tile.logoUrl}
              badge={tile.badge}
              onClick={() => handleTileClick(tile)}
            />
          ))}
        </div>
        {sorted.length === 0 && <EuiText color="subdued">No results found.</EuiText>}
      </>
    );
  };

  // ── Build accordion-style "click to select all" for expandable nav items ──

  const browseAccordionSelectAll = (
    allId: string,
    isInSection: (c: string) => boolean
  ) =>
    ({
      onClick,
      children,
      ...buttonProps
    }: React.ComponentPropsWithoutRef<'button'> & { children?: React.ReactNode }) => (
      <button
        type="button"
        {...buttonProps}
        onClick={(e) => {
          onClick?.(e);
          if (!isInSection(selectedCategory)) setSelectedCategory(allId);
        }}
      >
        {children}
      </button>
    );

  const rawQ = search.trim().toLowerCase();
  const showRecommended = selectedCategory === 'all' && !rawQ;

  return (
    <>
    <EuiFlyout
      onClose={onClose}
      ownFocus
      type="overlay"
      session="start"
      flyoutMenuProps={{ title: 'Add data to Elastic Observability' }}
      css={css`
        inline-size: 72vw !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        .euiFlyout__closeButton { z-index: 10; }
        [class*="euiFlyoutMenu__container"] {
          border-block-end: none !important;
          block-size: 0 !important;
          padding: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        & .euiFlyoutHeader {
          padding-block: 32px !important;
          padding-inline: 32px !important;
        }
        & .euiFlyoutBody__overflowContent {
          padding-block: 32px !important;
          padding-inline: 32px !important;
        }
        & .euiFlyoutFooter {
          padding-block: 16px !important;
          padding-inline: 32px !important;
        }
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              style={{
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                borderRadius: 10,
                padding: 4,
                flexShrink: 0,
              }}
            >
              <img
                src={integrationsHeaderImg}
                alt="Add data"
                style={{ width: 48, height: 48, objectFit: 'contain', display: 'block' }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>Add data to Elastic Observability</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
              Monitor your applications and infrastructure with powerful logs, metrics, traces,
              and AI-driven insights
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        >
        {renderFilterToolbar()}

        <EuiFlexGroup
          gutterSize="none"
          alignItems="flexStart"
          css={css`gap: calc(${euiTheme.size.xxl} + ${euiTheme.size.l});`}
        >
          {/* Left sidebar nav */}
          <EuiFlexItem
            grow={false}
            style={{
              width: 190,
              minWidth: 190,
              maxWidth: 190,
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
            }}
          >
            <EuiSideNav
              heading=""
              headingProps={{ screenReaderOnly: true }}
              css={sideNavCss}
              items={[
                {
                  id: 'nav-root',
                  name: '',
                  forceOpen: true,
                  items: [
                    {
                      id: 'all',
                      name: 'Recommended',
                      icon: <EuiIcon type="starEmpty" size="m" />,
                      isSelected: selectedCategory === 'all',
                      onClick: () => setSelectedCategory('all'),
                    },
                    {
                      id: 'nav-api-ingestion',
                      name: 'API ingestion',
                      icon: <EuiIcon type="editorCodeBlock" size="m" />,
                      isSelected: selectedCategory === 'all-api-ingestion',
                      onClick: () => setSelectedCategory('all-api-ingestion'),
                    },
                    {
                      id: 'nav-integrations',
                      name: 'Integrations',
                      icon: <EuiIcon type="apps" size="m" />,
                      renderItem: browseAccordionSelectAll('all-integrations', (c) => c === 'all-integrations' || c.startsWith('integration:')),
                      items: [
                        { id: 'cat-int-all', name: 'All integrations', isSelected: selectedCategory === 'all-integrations', onClick: () => setSelectedCategory('all-integrations') },
                        ...INTEGRATION_CATEGORIES.map((cat) => ({
                          id: `cat-int-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `integration:${cat}`,
                          onClick: () => setSelectedCategory(`integration:${cat}`),
                        })),
                      ],
                    },
                    {
                      id: 'nav-packages',
                      name: 'Input packages',
                      icon: <EuiIcon type="package" size="m" />,
                      renderItem: browseAccordionSelectAll('all-packages', (c) => c === 'all-packages' || c.startsWith('package:')),
                      items: [
                        { id: 'cat-pkg-all', name: 'All input packages', isSelected: selectedCategory === 'all-packages', onClick: () => setSelectedCategory('all-packages') },
                        ...PACKAGE_CATEGORIES.map((cat) => ({
                          id: `cat-pkg-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `package:${cat}`,
                          onClick: () => setSelectedCategory(`package:${cat}`),
                        })),
                      ],
                    },
                    {
                      id: 'nav-assets',
                      name: 'Assets',
                      icon: <EuiIcon type="layers" size="m" />,
                      renderItem: browseAccordionSelectAll('all-assets', (c) => c === 'all-assets' || c.startsWith('asset:')),
                      items: [
                        { id: 'cat-asset-all', name: 'All assets', isSelected: selectedCategory === 'all-assets', onClick: () => setSelectedCategory('all-assets') },
                        ...ASSET_CATEGORIES.map((cat) => ({
                          id: `cat-asset-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `asset:${cat}`,
                          onClick: () => setSelectedCategory(`asset:${cat}`),
                        })),
                      ],
                    },
                    {
                      id: 'nav-connectors',
                      name: 'Connectors',
                      icon: <EuiIcon type="link" size="m" />,
                      renderItem: browseAccordionSelectAll('all-connectors', (c) => c === 'all-connectors' || c.startsWith('connector:')),
                      items: [
                        { id: 'cat-conn-all', name: 'All connectors', isSelected: selectedCategory === 'all-connectors', onClick: () => setSelectedCategory('all-connectors') },
                        ...CONNECTOR_CATEGORIES.map((cat) => ({
                          id: `cat-conn-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `connector:${cat}`,
                          onClick: () => setSelectedCategory(`connector:${cat}`),
                        })),
                      ],
                    },
                    {
                      id: 'nav-divider-created',
                      name: '',
                      renderItem: () => <EuiHorizontalRule margin="xs" />,
                    },
                    {
                      id: 'nav-your-created',
                      name: 'Your created integrations',
                      items: [
                        {
                          id: 'nav-your-created-prompt',
                          name: '',
                          isSelected: false,
                          renderItem: () => (
                            <EuiEmptyPrompt
                              icon={<EuiIcon type="plusInCircle" size="m" color="subdued" />}
                              title={<h3>Create your own integration</h3>}
                              titleSize="xxxs"
                              body={<EuiText size="xs" color="subdued">Build a custom integration that fits your specific requirements.</EuiText>}
                              actions={[<EuiButtonEmpty size="xs" key="create">Create integration</EuiButtonEmpty>]}
                              color="subdued"
                              hasBorder
                              paddingSize="s"
                              css={css`max-width:100% !important;min-width:0 !important;width:100%;`}
                            />
                          ),
                        },
                      ],
                    },
                  ],
                },
              ]}
            />
          </EuiFlexItem>

          {/* Right content */}
          <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
            {showRecommended ? renderRecommendedContent() : renderCatalogueGrid()}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
    {selectedTile && (selectedTile.id === 'aws' || selectedTile.id.startsWith('amazon_')) && (
      <AwsFlyout
        logoUrl={selectedTile.logoUrl ?? ''}
        isChild
        onClose={() => setSelectedTile(null)}
        onSeeMyData={() => {
          onDataConnected();
          setSelectedTile(null);
          onClose();
        }}
      />
    )}
    {selectedTile && selectedTile.id !== 'aws' && !selectedTile.id.startsWith('amazon_') && (
      <EuiFlyout
        onClose={() => setSelectedTile(null)}
        aria-labelledby="childTileTitle"
        session="start"
        flyoutMenuProps={{ title: selectedTile.name }}
        css={css`
          inline-size: 74vw !important;
          animation-duration: 0s !important;
          transition-duration: 0s !important;
          [class*="euiFlyoutMenu__container"] {
            animation-duration: 0s !important;
            transition-duration: 0s !important;
          }
        `}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <CardLogoIcon src={selectedTile.logoUrl ?? ''} alt={`${selectedTile.name} logo`} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2 id="childTileTitle">{selectedTile.name}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {selectedTile.description ? (
            <EuiText><p>{selectedTile.description}</p></EuiText>
          ) : (
            <EuiText color="subdued"><p>No additional details available for this integration.</p></EuiText>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton fill>Add {selectedTile.name}</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    )}
  </>
  );
}
