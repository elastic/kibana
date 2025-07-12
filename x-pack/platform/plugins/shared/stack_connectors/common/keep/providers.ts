/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const providers = [
  {
    title: 'Airflow',
    sidebarTitle: 'Airflow Provider',
    description:
      'The Airflow provider integration allows you to send alerts (e.g. DAG failures) from Airflow to Keep via webhooks.',
    href: '/providers/documentation/airflow-provider',
  },
  {
    title: 'Azure AKS',
    description: 'Azure AKS provider to view kubernetes resources.',
    href: '/providers/documentation/aks-provider',
  },
  {
    title: 'AmazonSQS Provider',
    sidebarTitle: 'AmazonSQS Provider',
    description:
      'The AmazonSQS provider enables you to pull & push alerts to the Amazon SQS Queue.',
    href: '/providers/documentation/amazonsqs-provider',
  },
  {
    title: 'Anthropic Provider',
    description:
      "The Anthropic Provider allows for integrating Anthropic's Claude language models into Keep.",
    href: '/providers/documentation/anthropic-provider',
  },
  {
    title: 'AppDynamics',
    sidebarTitle: 'AppDynamics Provider',
    description:
      'AppDynamics provider allows you to get AppDynamics `alerts/actions` via webhook installation',
    href: '/providers/documentation/appdynamics-provider',
  },
  {
    title: 'Asana',
    sidebarTitle: 'Asana Provider',
    description: 'Asana Provider allows you to create and update tasks in Asana',
    href: '/providers/documentation/asana-provider',
  },
  {
    title: 'AWS S3',
    sidebarTitle: 'AWS S3 Provider',
    description: 'AWS S3 provider to query S3 buckets',
    href: '/providers/documentation/s3-provider',
  },
  {
    title: 'ArgoCD Provider',
    sidebarTitle: 'ArgoCD Provider',
    description: 'The ArgoCD provider enables you to pull topology and Application data.',
    href: '/providers/documentation/argocd-provider',
  },
  {
    title: 'Auth0',
    sidebarTitle: 'Auth0 Provider',
    description:
      'Auth0 provider allows interaction with Auth0 APIs for authentication and user management.',
    href: '/providers/documentation/auth0-provider',
  },
  {
    title: 'Axiom Provider',
    description: 'Axiom Provider is a class that allows to ingest/digest data from Axiom.',
    href: '/providers/documentation/axiom-provider',
  },
  {
    title: 'Azure Monitor',
    sidebarTitle: 'Azure Monitor Provider',
    description:
      'Azure Monitorg provider allows you to get alerts from Azure Monitor via webhooks.',
    href: '/providers/documentation/azuremonitoring-provider',
  },
  {
    title: 'Bash',
    sidebarTitle: 'Bash Provider',
    description:
      'Bash provider allows executing Bash commands in a workflow, with a limitation for cloud execution.',
    href: '/providers/documentation/bash-provider',
  },
  {
    title: 'BigQuery',
    sidebarTitle: 'BigQuery Provider',
    description:
      'BigQuery provider allows interaction with Google BigQuery for querying and managing datasets.',
    href: '/providers/documentation/bigquery-provider',
  },
  {
    title: 'Centreon',
    sidebarTitle: 'Centreon Provider',
    description: 'Centreon allows you to monitor your infrastructure with ease.',
    href: '/providers/documentation/centreon-provider',
  },
  {
    title: 'Checkmk',
    sidebarTitle: 'Checkmk Provider',
    description: 'Checkmk provider allows you to get alerts from Checkmk via webhooks.',
    href: '/providers/documentation/checkmk-provider',
  },
  {
    title: 'Checkly',
    sidebarTitle: 'Checkly Provider',
    description:
      'Checkly allows you to receive alerts from Checkly using API endpoints as well as webhooks',
    href: '/providers/documentation/checkly-provider',
  },
  {
    title: 'Cilium',
    sidebarTitle: 'Cilium Provider',
    description:
      'Cilium provider enables topology discovery by analyzing network flows between services in your Kubernetes cluster using Hubble.',
    href: '/providers/documentation/cilium-provider',
  },
  {
    title: 'ClickHouse',
    sidebarTitle: 'ClickHouse Provider',
    description: 'ClickHouse provider allows you to interact with ClickHouse database.',
    href: '/providers/documentation/clickhouse-provider',
  },
  {
    title: 'CloudWatch',
    sidebarTitle: 'CloudWatch Provider',
    description:
      'CloudWatch provider enables seamless integration with AWS CloudWatch for alerting and monitoring, directly pushing alarms into Keep.',
    href: '/providers/documentation/cloudwatch-provider',
  },
  {
    title: 'Console',
    sidebarTitle: 'Console Provider',
    description:
      'Console provider is sort of a mock provider that projects given alert message to the console.',
    href: '/providers/documentation/console-provider',
  },
  {
    title: 'Coralogix',
    sidebarTitle: 'Coralogix Provider',
    description:
      'Coralogix provider allows you to send alerts from Coralogix to Keep using webhooks.',
    href: '/providers/documentation/coralogix-provider',
  },
  {
    title: 'Dash0',
    sidebarTitle: 'Dash0 Provider',
    description: 'Dash0 provider allows you to get events from Dash0 using webhooks.',
    href: '/providers/documentation/dash0-provider',
  },
  {
    title: 'Databend',
    sidebarTitle: 'Databend Provider',
    description: 'Databend provider allows you to query databases',
    href: '/providers/documentation/databend-provider',
  },
  {
    title: 'Datadog',
    sidebarTitle: 'Datadog Provider',
    description:
      'Datadog provider allows you to query Datadog metrics and logs for monitoring and analytics.',
    href: '/providers/documentation/datadog-provider',
  },
  {
    title: 'DeepSeek Provider',
    description:
      "The DeepSeek Provider enables integration of DeepSeek's language models into Keep.",
    href: '/providers/documentation/deepseek-provider',
  },
  {
    title: 'Discord',
    sidebarTitle: 'Discord Provider',
    description: 'Discord provider is a provider that allows to send notifications to Discord',
    href: '/providers/documentation/discord-provider',
  },
  {
    title: 'Dynatrace',
    sidebarTitle: 'Dynatrace Provider',
    description:
      'Dynatrace provider allows integration with Dynatrace for monitoring, alerting, and collecting metrics.',
    href: '/providers/documentation/dynatrace-provider',
  },
  {
    title: 'EKS Provider',
    description:
      'EKS provider integrates with AWS EKS and let you interatct with kubernetes clusters hosted on EKS.',
    href: '/providers/documentation/eks-provider',
  },
  {
    title: 'Elastic',
    sidebarTitle: 'Elastic Provider',
    description:
      'Elastic provider is a provider used to query Elasticsearch (tested with elastic.co)',
    href: '/providers/documentation/elastic-provider',
  },
  {
    title: 'Flashduty',
    sidebarTitle: 'Flashduty Provider',
    description: 'Flashduty docs',
    href: '/providers/documentation/flashduty-provider',
  },
  {
    title: 'Flux CD',
    sidebarTitle: 'Flux CD Provider',
    description:
      'Flux CD Provider enables integration with Flux CD for GitOps topology and alerts.',
    href: '/providers/documentation/fluxcd-provider',
  },
  {
    title: 'GCP Monitoring',
    sidebarTitle: 'GCP Monitoring Provider',
    description:
      'GCP Monitoring provider allows you to get alerts and logs from GCP Monitoring via webhooks and log queries.',
    href: '/providers/documentation/gcpmonitoring-provider',
  },
  {
    title: 'Gemini Provider',
    description:
      "The Gemini Provider allows for integrating Google's Gemini language models into Keep.",
    href: '/providers/documentation/gemini-provider',
  },
  {
    title: 'GitHub',
    sidebarTitle: 'GitHub Provider',
    description:
      'GitHub provider allows integration with GitHub for managing repositories, issues, pull requests, and more.',
    href: '/providers/documentation/github-provider',
  },
  {
    title: 'Github Workflows',
    sidebarTitle: 'Github Workflows Provider',
    description: 'GithubWorkflowProvider is a provider that interacts with Github Workflows API.',
    href: '/providers/documentation/github_workflows_provider',
  },
  {
    title: 'GitLab Provider',
    sidebarTitle: 'GitLab Provider',
    description: 'GitLab provider is a provider used for creating issues in GitLab',
    href: '/providers/documentation/gitlab-provider',
  },
  {
    title: 'Gitlab Pipelines',
    sidebarTitle: 'Gitlab Pipelines Provider',
    description: 'GitlabPipelinesProvider is a provider that interacts with GitLab Pipelines API.',
    href: '/providers/documentation/gitlabpipelines-provider',
  },
  {
    title: 'Google Kubernetes Engine',
    sidebarTitle: 'Google Kubernetes Engine Provider',
    description:
      'Google Kubernetes Engine provider allows managing Google Kubernetes Engine clusters and related resources.',
    href: '/providers/documentation/gke-provider',
  },
  {
    title: 'Google Chat',
    sidebarTitle: 'Google Chat Provider',
    description: 'Google Chat provider is a provider that allows to send messages to Google Chat',
    href: '/providers/documentation/google_chat-provider',
  },
  {
    title: 'Grafana Provider',
    description:
      'Grafana Provider allows either pull/push alerts and pull Topology Map from Grafana to Keep.',
    href: '/providers/documentation/grafana-provider',
  },
  {
    title: 'Grafana Incident Provider',
    sidebarTitle: 'Grafana Incident Provider',
    description:
      'Grafana Incident Provider alows you to query all incidents from Grafana Incident.',
    href: '/providers/documentation/grafana_incident-provider',
  },
  {
    title: 'Grafana Loki',
    sidebarTitle: 'Grafana Loki Provider',
    description: 'Grafana Loki provider allows you to query logs from Grafana Loki.',
    href: '/providers/documentation/grafana_loki-provider',
  },
  {
    title: 'Grafana OnCall Provider',
    description:
      'Grafana Oncall Provider is a class that allows to ingest data to the Grafana OnCall.',
    href: '/providers/documentation/grafana_oncall-provider',
  },
  {
    title: 'Graylog Provider',
    sidebarTitle: 'Graylog Provider',
    description: 'The Graylog provider enables webhook installations for receiving alerts in Keep',
    href: '/providers/documentation/graylog-provider',
  },
  {
    title: 'Grok Provider',
    description: "The Grok Provider allows for integrating X.AI's Grok language models into Keep.",
    href: '/providers/documentation/grok-provider',
  },
  {
    title: 'HTTP Provider',
    description: 'HTTP Provider is a provider used to query/notify using HTTP requests',
    href: '/providers/documentation/http-provider',
  },
  {
    title: 'Icinga2 Provider',
    sidebarTitle: 'Icinga2',
    description: 'Icinga2 Provider Allows Reception of Push Alerts from Icinga2 to Keep.',
    href: '/providers/documentation/icinga2-provider',
  },
  {
    title: 'ilert Provider',
    sidebarTitle: 'ilert Provider',
    description:
      'The ilert provider enables the creation, updating, and resolution of events or incidents on ilert, leveraging both incident management and event notification capabilities for effective incident response.',
    href: '/providers/documentation/ilert-provider',
  },
  {
    title: 'Incident.io Provider',
    sidebarTitle: 'Incident.io Provider',
    description:
      'The Incident.io provider enables the querying of incidents on Incident.io, leveraging incident management capabilities for effective response.',
    href: '/providers/documentation/incidentio-provider',
  },
  {
    title: 'Incident Manager Provider',
    sidebarTitle: 'Incident Manager Provider',
    description: null,
    href: '/providers/documentation/incidentmanager-provider',
  },
  {
    title: 'Jira On-Prem Provider',
    sidebarTitle: 'Jira On-Prem Provider',
    description:
      'Jira On-Prem Provider is a provider used to query data and creating issues in Jira',
    href: '/providers/documentation/jira-on-prem-provider',
  },
  {
    title: 'Jira Cloud Provider',
    sidebarTitle: 'Jira Cloud Provider',
    description: 'Jira Cloud provider is a provider used to query data and creating issues in Jira',
    href: '/providers/documentation/jira-provider',
  },
  {
    title: 'Kafka',
    sidebarTitle: 'Kafka Provider',
    description:
      'Kafka provider allows integration with Apache Kafka for producing and consuming messages.',
    href: '/providers/documentation/kafka-provider',
  },
  {
    title: 'Keep',
    sidebarTitle: 'Keep Provider',
    description: 'Keep provider allows you to query and manage alerts in Keep.',
    href: '/providers/documentation/keep-provider',
  },
  {
    title: 'Kibana',
    sidebarTitle: 'Kibana Provider',
    description: 'Kibana provider allows you get alerts from Kibana Alerting via webhooks.',
    href: '/providers/documentation/kibana-provider',
  },
  {
    title: 'Kubernetes',
    description: 'Kubernetes provider to perform rollout restart or list pods action.',
    href: '/providers/documentation/kubernetes-provider',
  },
  {
    title: 'LibreNMS',
    sidebarTitle: 'LibreNMS Provider',
    description:
      'LibreNMS allows you to receive alerts from LibreNMS using API endpoints as well as webhooks',
    href: '/providers/documentation/libre_nms-provider',
  },
  {
    title: 'Linear Provider',
    sidebarTitle: 'Linear Provider',
    description:
      'Linear Provider is a provider for fetching data and creating issues in Linear app.',
    href: '/providers/documentation/linear_provider',
  },
  {
    title: 'LinearB',
    sidebarTitle: 'LinearB Provider',
    description:
      "The LinearB provider enables integration with LinearB's API to manage and notify incidents directly through webhooks.",
    href: '/providers/documentation/linearb-provider',
  },
  {
    title: 'LiteLLM Provider',
    description: 'The LiteLLM Provider enables integration with LiteLLM proxy into Keep.',
    href: '/providers/documentation/litellm-provider',
  },
  {
    title: 'Llama.cpp Provider',
    description:
      'The Llama.cpp Provider allows for integrating locally running Llama.cpp models into Keep.',
    href: '/providers/documentation/llamacpp-provider',
  },
  {
    title: 'Mailgun Provider',
    description: 'Mailgun Provider allows sending alerts to Keep via email.',
    href: '/providers/documentation/mailgun-provider',
  },
  {
    title: 'Mattermost Provider',
    sidebarTitle: 'Mattermost Provider',
    description: 'Mattermost provider is used to send messages to Mattermost.',
    href: '/providers/documentation/mattermost-provider',
  },
  {
    title: 'Mock',
    sidebarTitle: 'Mock Provider',
    description: "Template Provider is a template for newly added provider's documentation",
    href: '/providers/documentation/mock-provider',
  },
  {
    title: 'Monday',
    sidebar_label: 'Monday Provider',
    description: 'Monday Provider allows you to add new pulses to your boards',
    href: '/providers/documentation/monday-provider',
  },
  {
    title: 'MongoDB',
    sidebarTitle: 'MongoDB Provider',
    description: 'MongoDB Provider is a provider used to query MongoDB databases',
    href: '/providers/documentation/mongodb-provider',
  },
  {
    title: 'MySQL',
    sidebarTitle: 'MySQL Provider',
    description: 'MySQL Provider is a provider used to query MySQL databases',
    href: '/providers/documentation/mysql-provider',
  },
  {
    title: 'NetBox',
    sidebarTitle: 'NetBox Provider',
    description: 'NetBox provider allows you to get events from NetBox through webhook.',
    href: '/providers/documentation/netbox-provider',
  },
  {
    title: 'Netdata',
    sidebarTitle: 'Netdata Provider',
    description: 'Netdata provider allows you to get alerts from Netdata via webhooks.',
    href: '/providers/documentation/netdata-provider',
  },
  {
    title: 'New Relic',
    sidebarTitle: 'New Relic Provider',
    description: 'New Relic Provider enables querying AI alerts and registering webhooks.',
    href: '/providers/documentation/new-relic-provider',
  },
  {
    title: 'Ntfy.sh',
    sidebarTitle: 'Ntfy.sh Provider',
    description: 'Ntfy.sh allows you to send notifications to your devices',
    href: '/providers/documentation/ntfy-provider',
  },
  {
    title: 'Ollama Provider',
    description:
      'The Ollama Provider allows for integrating locally running Ollama language models into Keep.',
    href: '/providers/documentation/ollama-provider',
  },
  {
    title: 'OpenAI Provider',
    description: "The OpenAI Provider allows for integrating OpenAI's language models into Keep.",
    href: '/providers/documentation/openai-provider',
  },
  {
    title: 'OpenObserve',
    sidebarTitle: 'OpenObserve Provider',
    description:
      'OpenObserve provider allows you to get OpenObserve `alerts/actions` via webhook installation',
    href: '/providers/documentation/openobserve-provider',
  },
  {
    title: 'OpenSearch Serverless',
    sidebarTitle: 'OpenSearchServerless Provider',
    description:
      'OpenSearch Serverless provider enables seamless integration with AWS OpenSearch Serverless for document-level querying, alerting, and writing, directly into Keep.',
    href: '/providers/documentation/opensearchserverless-provider',
  },
  {
    title: 'Openshift',
    description: 'Openshift provider to perform rollout restart action on specific resources.',
    href: '/providers/documentation/openshift-provider',
  },
  {
    title: 'Opsgenie Provider',
    description: 'OpsGenie Provider is a provider that allows to create alerts in OpsGenie.',
    href: '/providers/documentation/opsgenie-provider',
  },
  {
    title: 'Pagerduty Provider',
    description:
      'Pagerduty Provider allows integration with PagerDuty to create, manage, and synchronize incidents and alerts within Keep.',
    href: '/providers/documentation/pagerduty-provider',
  },
  {
    title: 'Pagertree Provider',
    description:
      'The Pagertree Provider facilitates interactions with the Pagertree API, allowing the retrieval and management of alerts.',
    href: '/providers/documentation/pagertree-provider',
  },
  {
    title: 'Parseable',
    sidebarTitle: 'Parseable Provider',
    description:
      'Parseable provider allows integration with Parseable, a tool for collecting and querying logs.',
    href: '/providers/documentation/parseable-provider',
  },
  {
    title: 'Pingdom',
    sidebarTitle: 'Pingdom Provider',
    description:
      'Pingdom provider allows you to pull alerts from Pingdom or install Keep as webhook.',
    href: '/providers/documentation/pingdom-provider',
  },
  {
    title: 'PostHog',
    sidebarTitle: 'PostHog Provider',
    description:
      'PostHog provider allows you to query session recordings and analytics data from PostHog.',
    href: '/providers/documentation/posthog-provider',
  },
  {
    title: 'Microsoft Planner Provider',
    description: 'Microsoft Planner Provider to create task in planner.',
    href: '/providers/documentation/planner-provider',
  },
  {
    title: 'PostgreSQL',
    sidebarTitle: 'PostgreSQL Provider',
    description: 'PostgreSQL Provider is a provider used to query POSTGRES databases',
    href: '/providers/documentation/postgresql-provider',
  },
  {
    title: 'Prometheus',
    sidebarTitle: 'Prometheus Provider',
    description:
      'Prometheus provider allows integration with Prometheus for monitoring and alerting purposes.',
    href: '/providers/documentation/prometheus-provider',
  },
  {
    title: 'Pushover',
    sidebarTitle: 'Pushover Provider',
    description: 'Pushover docs',
    href: '/providers/documentation/pushover-provider',
  },
  {
    title: 'Python',
    sidebarTitle: 'Python Provider',
    description: 'Python provider allows executing Python code snippets.',
    href: '/providers/documentation/python-provider',
  },
  {
    title: 'QuickChart Provider',
    sidebarTitle: 'QuickChart Provider',
    description:
      'The QuickChart provider enables the generation of chart images through a simple and open API, allowing visualization of alert trends and counts. It supports both anonymous usage and authenticated access with an API key for enhanced functionality.',
    href: '/providers/documentation/quickchart-provider',
  },
  {
    title: 'Redmine',
    sidebarTitle: 'Redmine Provider',
    description: null,
    href: '/providers/documentation/redmine-provider',
  },
  {
    title: 'Resend',
    sidebarTitle: 'Resend Provider',
    description: null,
    href: '/providers/documentation/resend-provider',
  },
  {
    title: 'Rollbar',
    sidebarTitle: 'Rollbar Provider',
    description: 'Rollbar provides real-time error tracking and debugging tools for developers.',
    href: '/providers/documentation/rollbar-provider',
  },
  {
    title: 'SendGrid',
    sidebarTitle: 'SendGrid Provider',
    description: null,
    href: '/providers/documentation/sendgrid-provider',
  },
  {
    title: 'Sentry',
    sidebarTitle: 'Sentry Provider',
    description:
      'Sentry provider allows you to query Sentry events and to pull/push alerts from Sentry',
    href: '/providers/documentation/sentry-provider',
  },
  {
    title: 'Service Now',
    sidebarTitle: 'Service Now Provider',
    description:
      'Service Now provider allows sending notifications, updates, and retrieving topology information from the ServiceNow CMDB.',
    href: '/providers/documentation/service-now-provider',
  },
  {
    title: 'SignalFX',
    sidebarTitle: 'SignalFX Provider',
    description: 'SignalFX provider allows you get alerts from SignalFX Alerting via webhooks.',
    href: '/providers/documentation/signalfx-provider',
  },
  {
    title: 'SIGNL4 Provider',
    description:
      'SIGNL4 offers critical alerting, incident response and service dispatching for operating critical infrastructure. It alerts you persistently via app push, SMS text and voice calls including tracking, escalation, collaboration and duty planning. Find out more at [signl4.com](https://www.signl4.com/)',
    href: '/providers/documentation/signl4-provider',
  },
  {
    title: 'Site24x7 Provider',
    description:
      'The Site24x7 Provider allows you to install webhooks and receive alerts in Site24x7. It manages authentication, setup of webhooks, and retrieval of alert logs from Site24x7.',
    href: '/providers/documentation/site24x7-provider',
  },
  {
    title: "Keep's integration for Slack",
    sidebarTitle: 'Integration for Slack',
    description:
      'Enhance your Keep workflows with direct Slack notifications. Simplify communication with timely updates and alerts directly within Slack.',
    href: '/providers/documentation/slack-provider',
  },
  {
    title: 'SMTP',
    sidebarTitle: 'SMTP Provider',
    description: 'SMTP Provider allows you to send emails.',
    href: '/providers/documentation/smtp-provider',
  },
  {
    title: 'Snowflake',
    sidebarTitle: 'Snowflake Provider',
    description: "Template Provider is a template for newly added provider's documentation",
    href: '/providers/documentation/snowflake-provider',
  },
  {
    title: 'Splunk',
    sidebarTitle: 'Splunk Provider',
    description:
      'Splunk provider allows you to get Splunk `saved searches` via webhook installation',
    href: '/providers/documentation/splunk-provider',
  },
  {
    title: 'Squadcast Provider',
    sidebarTitle: 'Squadcast Provider',
    description: 'Squadcast provider is a provider used for creating issues in Squadcast',
    href: '/providers/documentation/squadcast-provider',
  },
  {
    title: 'SSH',
    sidebarTitle: 'SSH Provider',
    description:
      'The `SSH Provider` is a provider that provides a way to execute SSH commands and get their output.',
    href: '/providers/documentation/ssh-provider',
  },
  {
    title: 'StatusCake',
    sidebarTitle: 'StatusCake Provider',
    description:
      'StatusCake allows you to monitor your website and APIs. Keep allows to read alerts and install webhook in StatusCake',
    href: '/providers/documentation/statuscake-provider',
  },
  {
    title: 'SumoLogic Provider',
    sidebarTitle: 'SumoLogic Provider',
    description:
      'The SumoLogic provider enables webhook installations for receiving alerts in keep',
    href: '/providers/documentation/sumologic-provider',
  },
  {
    title: 'Microsoft Teams Provider',
    sidebarTitle: 'Microsoft Teams Provider',
    description:
      'Microsoft Teams Provider is a provider that allows to notify alerts to Microsoft Teams chats.',
    href: '/providers/documentation/teams-provider',
  },
  {
    title: 'Telegram Provider',
    description: 'Telegram Provider is a provider that allows to notify alerts to telegram chats.',
    href: '/providers/documentation/telegram-provider',
  },
  {
    title: 'Template',
    description: "Template Provider is a template for newly added provider's documentation",
    href: '/providers/documentation/template',
  },
  {
    title: 'ThousandEyes',
    sidebarTitle: 'ThousandEyes Provider',
    description:
      'ThousandEyes allows you to receive alerts from ThousandEyes using API endpoints as well as webhooks',
    href: '/providers/documentation/thousandeyes-provider',
  },
  {
    title: 'Trello',
    sidebarTitle: 'Trello Provider',
    description: 'Trello provider is a provider used to query data from Trello',
    href: '/providers/documentation/trello-provider',
  },
  {
    title: 'Twilio Provider',
    description: 'Twilio Provider is a provider that allows to notify alerts via SMS using Twilio.',
    href: '/providers/documentation/twilio-provider',
  },
  {
    title: 'UptimeKuma',
    sidebarTitle: 'UptimeKuma Provider',
    description: 'UptimeKuma allows you to monitor your website and APIs and send alert to keep',
    href: '/providers/documentation/uptimekuma-provider',
  },
  {
    title: 'VictoriaLogs',
    sidebarTitle: 'VictoriaLogs Provider',
    description: 'VictoriaLogs provider allows you to query logs from VictoriaLogs.',
    href: '/providers/documentation/victorialogs-provider',
  },
  {
    title: 'Victoriametrics Provider',
    sidebarTitle: 'Victoriametrics Provider',
    description: 'The VictoriametricsProvider allows you to fetch alerts in Victoriametrics.',
    href: '/providers/documentation/victoriametrics-provider',
  },
  {
    title: 'vLLM Provider',
    description:
      'The vLLM Provider enables integration with vLLM-deployed language models into Keep.',
    href: '/providers/documentation/vllm-provider',
  },
  {
    title: 'Wazuh',
    sidebarTitle: 'Wazuh Provider',
    description: 'Wazuh provider allows you to get alerts from Wazuh via custom integration.',
    href: '/providers/documentation/wazuh-provider',
  },
  // {
  //   "title": "Webhook",
  //   "sidebarTitle": "Webhook Provider",
  //   "description": "A webhook is a method used to send real-time data from one application to another whenever a specific event occurs",
  //   "href": "/providers/documentation/webhook-provider"
  // },
  {
    title: 'Websocket',
    description: null,
    href: '/providers/documentation/websocket-provider',
  },
  {
    title: 'YouTrack',
    sidebarTitle: 'YouTrack Provider',
    description: 'YouTrack provider allows you to create new issues in YouTrack.',
    href: '/providers/documentation/youtrack-provider',
  },
  {
    title: 'Zabbix',
    sidebarTitle: 'Zabbix Provider',
    description: 'Zabbix provider allows you to pull/push alerts from Zabbix',
    href: '/providers/documentation/zabbix-provider',
  },
  {
    title: 'Zenduty',
    sidebarTitle: 'Zenduty Provider',
    description: 'Zenduty docs',
    href: '/providers/documentation/zenduty-provider',
  },
  {
    title: 'Zoom',
    sidebarTitle: 'Zoom Provider',
    description: 'Zoom provider allows you to create meetings with Zoom.',
    href: '/providers/documentation/zoom-provider',
  },
];
