/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SystemIdentificationEvaluationExample {
  input: {
    stream: {
      name: string;
    };
    systems: {
      loghub: string[];
      serverless: string[];
    };
  };
  output: {
    criteria: string[];
    weight?: number;
  };
  metadata: {};
}

export interface SystemIdentificationEvaluationDataset {
  name: string;
  description: string;
  examples: SystemIdentificationEvaluationExample[];
}

export const SYSTEM_IDENTIFICATION_DATASETS: {
  loghub: SystemIdentificationEvaluationDataset[];
  serverless: SystemIdentificationEvaluationDataset[];
  mixed: SystemIdentificationEvaluationDataset[];
} = {
  loghub: [
    {
      name: 'streams: feature identification loghub',
      description: 'Seeded-random selections of loghub systems for 3, 5, 5, 8 + android scenarios',
      examples: [
        {
          input: {
            stream: {
              name: 'logs.loghub',
            },
            systems: {
              loghub: ['HealthApp', 'Zookeeper', 'OpenStack'],
              serverless: [],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of HealthApp, Zookeeper, OpenStack',
              'Identifies at least 3 systems out of HealthApp, Zookeeper, OpenStack',
              'Does not identify systems outside provided lists',
            ],
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.loghub',
            },
            systems: {
              loghub: ['Zookeeper', 'OpenSSH', 'Proxifier', 'Apache', 'Thunderbird'],
              serverless: [],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of Zookeeper, OpenSSH, Proxifier, Apache, Thunderbird',
              'Identifies at least 3 systems out of Zookeeper, OpenSSH, Proxifier, Apache, Thunderbird',
              'Identifies at least 5 systems out of Zookeeper, OpenSSH, Proxifier, Apache, Thunderbird',
              'Does not identify systems outside provided lists',
            ],
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.loghub',
            },
            systems: {
              loghub: ['Zookeeper', 'OpenStack', 'HealthApp', 'Thunderbird', 'Proxifier'],
              serverless: [],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of Zookeeper, OpenStack, HealthApp, Thunderbird, Proxifier',
              'Identifies at least 3 systems out of Zookeeper, OpenStack, HealthApp, Thunderbird, Proxifier',
              'Identifies at least 5 systems out of Zookeeper, OpenStack, HealthApp, Thunderbird, Proxifier',
              'Does not identify systems outside provided lists',
            ],
            weight: 2,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.loghub',
            },
            systems: {
              loghub: [
                'HealthApp',
                'HPC',
                'Proxifier',
                'HDFS',
                'OpenStack',
                'Hadoop',
                'Zookeeper',
                'Mac',
              ],
              serverless: [],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of HealthApp, HPC, Proxifier, HDFS, OpenStack, Hadoop, Zookeeper, Mac',
              'Identifies at least 3 systems out of HealthApp, HPC, Proxifier, HDFS, OpenStack, Hadoop, Zookeeper, Mac',
              'Identifies at least 5 systems out of HealthApp, HPC, Proxifier, HDFS, OpenStack, Hadoop, Zookeeper, Mac',
              'Identifies at least 8 systems out of HealthApp, HPC, Proxifier, HDFS, OpenStack, Hadoop, Zookeeper, Mac',
              'Does not identify systems outside provided lists',
            ],
            weight: 3,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.android',
            },
            systems: {
              loghub: [],
              serverless: [],
            },
          },
          output: {
            criteria: [
              'Identifies three systems by process.name: com.tencent.qt.qtl,com.android.systemui, com.android.phone',
              'Adds a filter for process.name, optionally with other filters',
              'Adds a filter for process.name BUT no other filters',
            ],
            weight: 2,
          },
          metadata: {},
        },
      ],
    },
  ],
  serverless: [
    {
      name: 'streams: feature identification serverless',
      description: 'Seeded-random selections of serverless systems for 3, 5, 5, 8, 12 scenarios',
      examples: [
        {
          input: {
            stream: {
              name: 'logs.serverless',
            },
            systems: {
              loghub: [],
              serverless: [
                'logs-nodepool-rollout-controller.log-default',
                'logs-argo-workflows-argo-server.log-default',
                'logs-apm-index-service-us-east-1a.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one serverless system out of logs-nodepool-rollout-controller.log-default, logs-argo-workflows-argo-server.log-default, logs-apm-index-service-us-east-1a.log-default',
              'Identifies at least 3 serverless systems out of logs-nodepool-rollout-controller.log-default, logs-argo-workflows-argo-server.log-default, logs-apm-index-service-us-east-1a.log-default',
              'Does not identify systems outside provided lists',
            ],
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.serverless',
            },
            systems: {
              loghub: [],
              serverless: [
                'logs-apm-aggregation-service-l1-us-east-1b.log-default',
                'logs-object-storage-api.log-default',
                'logs-archive-csi-driver.log-default',
                'logs-usage-api.log-default',
                'logs-fleet.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one serverless system out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-object-storage-api.log-default, logs-archive-csi-driver.log-default, logs-usage-api.log-default, logs-fleet.log-default',
              'Identifies at least 3 serverless systems out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-object-storage-api.log-default, logs-archive-csi-driver.log-default, logs-usage-api.log-default, logs-fleet.log-default',
              'Identifies at least 5 serverless systems out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-object-storage-api.log-default, logs-archive-csi-driver.log-default, logs-usage-api.log-default, logs-fleet.log-default',
              'Does not identify systems outside provided lists',
            ],
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.serverless',
            },
            systems: {
              loghub: [],
              serverless: [
                'logs-apm-aggregation-service-l1-us-east-1b.log-default',
                'logs-proxy.log-default',
                'logs-mki-descheduler.log-default',
                'logs-postgresql.log-rds',
                'logs-external-secrets-cert-controller.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one serverless system out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-proxy.log-default, logs-mki-descheduler.log-default, logs-postgresql.log-rds, logs-external-secrets-cert-controller.log-default',
              'Identifies at least 3 serverless systems out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-proxy.log-default, logs-mki-descheduler.log-default, logs-postgresql.log-rds, logs-external-secrets-cert-controller.log-default',
              'Identifies at least 5 serverless systems out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-proxy.log-default, logs-mki-descheduler.log-default, logs-postgresql.log-rds, logs-external-secrets-cert-controller.log-default',
              'Does not identify systems outside provided lists',
            ],
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.serverless',
            },
            systems: {
              loghub: [],
              serverless: [
                'logs-nodepool-rollout-controller.log-default',
                'logs-hubble-relay.log-default',
                'logs-apm-index-service-us-east-1a.log-default',
                'logs-agentless-controller.log-default',
                'logs-apm-aggregation-service-l1-us-east-1a.log-default',
                'logs-elastic-pod-autoscaler.log-default',
                'logs-elasticsearch-autoscaler.log-default',
                'logs-cainjector.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one serverless system out of logs-nodepool-rollout-controller.log-default, logs-hubble-relay.log-default, logs-apm-index-service-us-east-1a.log-default, logs-agentless-controller.log-default, logs-apm-aggregation-service-l1-us-east-1a.log-default, logs-elastic-pod-autoscaler.log-default, logs-elasticsearch-autoscaler.log-default, logs-cainjector.log-default',
              'Identifies at least 3 serverless systems out of logs-nodepool-rollout-controller.log-default, logs-hubble-relay.log-default, logs-apm-index-service-us-east-1a.log-default, logs-agentless-controller.log-default, logs-apm-aggregation-service-l1-us-east-1a.log-default, logs-elastic-pod-autoscaler.log-default, logs-elasticsearch-autoscaler.log-default, logs-cainjector.log-default',
              'Identifies at least 5 serverless systems out of logs-nodepool-rollout-controller.log-default, logs-hubble-relay.log-default, logs-apm-index-service-us-east-1a.log-default, logs-agentless-controller.log-default, logs-apm-aggregation-service-l1-us-east-1a.log-default, logs-elastic-pod-autoscaler.log-default, logs-elasticsearch-autoscaler.log-default, logs-cainjector.log-default',
              'Identifies at least 8 serverless systems out of logs-nodepool-rollout-controller.log-default, logs-hubble-relay.log-default, logs-apm-index-service-us-east-1a.log-default, logs-agentless-controller.log-default, logs-apm-aggregation-service-l1-us-east-1a.log-default, logs-elastic-pod-autoscaler.log-default, logs-elasticsearch-autoscaler.log-default, logs-cainjector.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 2,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.serverless',
            },
            systems: {
              loghub: [],
              serverless: [
                'logs-aws-load-balancer-controller.log-default',
                'logs-elasticsearch-k8s-metrics-adapter.log-default',
                'logs-agentless.log-default',
                'logs-argocd-server.log-default',
                'logs-usage-api.log-default',
                'logs-aws.cloudwatch_logs-cloud_wan',
                'logs-object-storage-api.log-default',
                'logs-crossplane.log-default',
                'logs-object-storage-controller.log-default',
                'logs-fleet.log-default',
                'logs-regional-network-controller.log-default',
                'logs-redis.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one serverless system out of logs-aws-load-balancer-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-agentless.log-default, logs-argocd-server.log-default, logs-usage-api.log-default, logs-aws.cloudwatch_logs-cloud_wan, logs-object-storage-api.log-default, logs-crossplane.log-default, logs-object-storage-controller.log-default, logs-fleet.log-default, logs-regional-network-controller.log-default, logs-redis.log-default',
              'Identifies at least 3 serverless systems out of logs-aws-load-balancer-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-agentless.log-default, logs-argocd-server.log-default, logs-usage-api.log-default, logs-aws.cloudwatch_logs-cloud_wan, logs-object-storage-api.log-default, logs-crossplane.log-default, logs-object-storage-controller.log-default, logs-fleet.log-default, logs-regional-network-controller.log-default, logs-redis.log-default',
              'Identifies at least 5 serverless systems out of logs-aws-load-balancer-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-agentless.log-default, logs-argocd-server.log-default, logs-usage-api.log-default, logs-aws.cloudwatch_logs-cloud_wan, logs-object-storage-api.log-default, logs-crossplane.log-default, logs-object-storage-controller.log-default, logs-fleet.log-default, logs-regional-network-controller.log-default, logs-redis.log-default',
              'Identifies at least 8 serverless systems out of logs-aws-load-balancer-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-agentless.log-default, logs-argocd-server.log-default, logs-usage-api.log-default, logs-aws.cloudwatch_logs-cloud_wan, logs-object-storage-api.log-default, logs-crossplane.log-default, logs-object-storage-controller.log-default, logs-fleet.log-default, logs-regional-network-controller.log-default, logs-redis.log-default',
              'Identifies at least 12 serverless systems out of logs-aws-load-balancer-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-agentless.log-default, logs-argocd-server.log-default, logs-usage-api.log-default, logs-aws.cloudwatch_logs-cloud_wan, logs-object-storage-api.log-default, logs-crossplane.log-default, logs-object-storage-controller.log-default, logs-fleet.log-default, logs-regional-network-controller.log-default, logs-redis.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 3,
          },
          metadata: {},
        },
      ],
    },
  ],
  mixed: [
    {
      name: 'streams: feature identification mixed',
      description:
        'Seeded-random selections mixing loghub + serverless systems for various scenarios',
      examples: [
        {
          input: {
            stream: {
              name: 'logs.mixed',
            },
            systems: {
              loghub: ['HDFS'],
              serverless: [
                'logs-apm-aggregation-service-l1-us-east-1b.log-default',
                'logs-apm-queue-manager.log-default',
                'logs-external-secrets-webhook.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of HDFS',
              'Identifies at least one serverless system out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-apm-queue-manager.log-default, logs-external-secrets-webhook.log-default',
              'Identifies at least 3 serverless systems out of logs-apm-aggregation-service-l1-us-east-1b.log-default, logs-apm-queue-manager.log-default, logs-external-secrets-webhook.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 1,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.mixed',
            },
            systems: {
              loghub: ['Thunderbird', 'Apache'],
              serverless: [
                'logs-apm-aggregation-service-l1.log-default',
                'logs-archive-csi-driver.log-default',
                'logs-nginx-admin-ingress.log-default',
                'logs-policy-reporter.log-default',
                'logs-apm-index-service.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of Thunderbird, Apache',
              'Identifies at least one serverless system out of logs-apm-aggregation-service-l1.log-default, logs-archive-csi-driver.log-default, logs-nginx-admin-ingress.log-default, logs-policy-reporter.log-default, logs-apm-index-service.log-default',
              'Identifies at least 3 serverless systems out of logs-apm-aggregation-service-l1.log-default, logs-archive-csi-driver.log-default, logs-nginx-admin-ingress.log-default, logs-policy-reporter.log-default, logs-apm-index-service.log-default',
              'Identifies at least 5 serverless systems out of logs-apm-aggregation-service-l1.log-default, logs-archive-csi-driver.log-default, logs-nginx-admin-ingress.log-default, logs-policy-reporter.log-default, logs-apm-index-service.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 1,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.mixed',
            },
            systems: {
              loghub: ['Apache', 'Thunderbird', 'HealthApp', 'OpenStack', 'Proxifier'],
              serverless: [
                'logs-cilium-node-init.log-default',
                'logs-mki-cluster-autoscaler.log-default',
                'logs-mki-scheduler.log-default',
                'logs-external-secrets.log-default',
                'logs-cainjector.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of Apache, Thunderbird, HealthApp, OpenStack, Proxifier',
              'Identifies at least 3 systems out of Apache, Thunderbird, HealthApp, OpenStack, Proxifier',
              'Identifies at least 5 systems out of Apache, Thunderbird, HealthApp, OpenStack, Proxifier',
              'Identifies at least one serverless system out of logs-cilium-node-init.log-default, logs-mki-cluster-autoscaler.log-default, logs-mki-scheduler.log-default, logs-external-secrets.log-default, logs-cainjector.log-default',
              'Identifies at least 3 serverless systems out of logs-cilium-node-init.log-default, logs-mki-cluster-autoscaler.log-default, logs-mki-scheduler.log-default, logs-external-secrets.log-default, logs-cainjector.log-default',
              'Identifies at least 5 serverless systems out of logs-cilium-node-init.log-default, logs-mki-cluster-autoscaler.log-default, logs-mki-scheduler.log-default, logs-external-secrets.log-default, logs-cainjector.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 2,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.mixed',
            },
            systems: {
              loghub: ['HDFS', 'Thunderbird', 'Hadoop'],
              serverless: [
                'logs-fleet-controller.log-default',
                'logs-apm-aggregation-service-l1-us-east-1d.log-default',
                'logs-elasticsearch-controller.log-default',
                'logs-cilium-node-init.log-default',
                'logs-mki-descheduler.log-default',
                'logs-lightweight-cert-manager.log-default',
                'logs-argo-events.log-default',
                'logs-policy-reporter.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of HDFS, Thunderbird, Hadoop',
              'Identifies at least 3 systems out of HDFS, Thunderbird, Hadoop',
              'Identifies at least one serverless system out of logs-fleet-controller.log-default, logs-apm-aggregation-service-l1-us-east-1d.log-default, logs-elasticsearch-controller.log-default, logs-cilium-node-init.log-default, logs-mki-descheduler.log-default, logs-lightweight-cert-manager.log-default, logs-argo-events.log-default, logs-policy-reporter.log-default',
              'Identifies at least 3 serverless systems out of logs-fleet-controller.log-default, logs-apm-aggregation-service-l1-us-east-1d.log-default, logs-elasticsearch-controller.log-default, logs-cilium-node-init.log-default, logs-mki-descheduler.log-default, logs-lightweight-cert-manager.log-default, logs-argo-events.log-default, logs-policy-reporter.log-default',
              'Identifies at least 5 serverless systems out of logs-fleet-controller.log-default, logs-apm-aggregation-service-l1-us-east-1d.log-default, logs-elasticsearch-controller.log-default, logs-cilium-node-init.log-default, logs-mki-descheduler.log-default, logs-lightweight-cert-manager.log-default, logs-argo-events.log-default, logs-policy-reporter.log-default',
              'Identifies at least 8 serverless systems out of logs-fleet-controller.log-default, logs-apm-aggregation-service-l1-us-east-1d.log-default, logs-elasticsearch-controller.log-default, logs-cilium-node-init.log-default, logs-mki-descheduler.log-default, logs-lightweight-cert-manager.log-default, logs-argo-events.log-default, logs-policy-reporter.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 3,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.mixed',
            },
            systems: {
              loghub: [
                'OpenStack',
                'HealthApp',
                'Spark',
                'HDFS',
                'HPC',
                'Mac',
                'OpenSSH',
                'Zookeeper',
              ],
              serverless: [
                'logs-mki-cluster-autoscaler.log-default',
                'logs-elasticsearch.apm_agent-default',
                'logs-pod-resource-meter.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of OpenStack, HealthApp, Spark, HDFS, HPC, Mac, OpenSSH, Zookeeper',
              'Identifies at least 3 systems out of OpenStack, HealthApp, Spark, HDFS, HPC, Mac, OpenSSH, Zookeeper',
              'Identifies at least 5 systems out of OpenStack, HealthApp, Spark, HDFS, HPC, Mac, OpenSSH, Zookeeper',
              'Identifies at least 8 systems out of OpenStack, HealthApp, Spark, HDFS, HPC, Mac, OpenSSH, Zookeeper',
              'Identifies at least one serverless system out of logs-mki-cluster-autoscaler.log-default, logs-elasticsearch.apm_agent-default, logs-pod-resource-meter.log-default',
              'Identifies at least 3 serverless systems out of logs-mki-cluster-autoscaler.log-default, logs-elasticsearch.apm_agent-default, logs-pod-resource-meter.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 3,
          },
          metadata: {},
        },
        {
          input: {
            stream: {
              name: 'logs.mixed',
            },
            systems: {
              loghub: [
                'OpenSSH',
                'HealthApp',
                'Mac',
                'Hadoop',
                'Proxifier',
                'Spark',
                'OpenStack',
                'HPC',
              ],
              serverless: [
                'logs-apm-aggregation-service-l1-us-east-1c.log-default',
                'logs-agentless.log-default',
                'logs-apm-index-service-us-east-1d.log-default',
                'logs-argocd-cluster-registration-controller.log-default',
                'logs-elasticsearch-k8s-metrics-adapter.log-default',
                'logs-apm-index-service-us-east-1c.log-default',
                'logs-container_logs.log-default',
                'logs-cert-manager.log-default',
              ],
            },
          },
          output: {
            criteria: [
              'Identifies at least one system out of OpenSSH, HealthApp, Mac, Hadoop, Proxifier, Spark, OpenStack, HPC',
              'Identifies at least 3 systems out of OpenSSH, HealthApp, Mac, Hadoop, Proxifier, Spark, OpenStack, HPC',
              'Identifies at least 5 systems out of OpenSSH, HealthApp, Mac, Hadoop, Proxifier, Spark, OpenStack, HPC',
              'Identifies at least 8 systems out of OpenSSH, HealthApp, Mac, Hadoop, Proxifier, Spark, OpenStack, HPC',
              'Identifies at least one serverless system out of logs-apm-aggregation-service-l1-us-east-1c.log-default, logs-agentless.log-default, logs-apm-index-service-us-east-1d.log-default, logs-argocd-cluster-registration-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-apm-index-service-us-east-1c.log-default, logs-container_logs.log-default, logs-cert-manager.log-default',
              'Identifies at least 3 serverless systems out of logs-apm-aggregation-service-l1-us-east-1c.log-default, logs-agentless.log-default, logs-apm-index-service-us-east-1d.log-default, logs-argocd-cluster-registration-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-apm-index-service-us-east-1c.log-default, logs-container_logs.log-default, logs-cert-manager.log-default',
              'Identifies at least 5 serverless systems out of logs-apm-aggregation-service-l1-us-east-1c.log-default, logs-agentless.log-default, logs-apm-index-service-us-east-1d.log-default, logs-argocd-cluster-registration-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-apm-index-service-us-east-1c.log-default, logs-container_logs.log-default, logs-cert-manager.log-default',
              'Identifies at least 8 serverless systems out of logs-apm-aggregation-service-l1-us-east-1c.log-default, logs-agentless.log-default, logs-apm-index-service-us-east-1d.log-default, logs-argocd-cluster-registration-controller.log-default, logs-elasticsearch-k8s-metrics-adapter.log-default, logs-apm-index-service-us-east-1c.log-default, logs-container_logs.log-default, logs-cert-manager.log-default',
              'Does not identify systems outside provided lists',
            ],
            weight: 5,
          },
          metadata: {},
        },
      ],
    },
  ],
};
