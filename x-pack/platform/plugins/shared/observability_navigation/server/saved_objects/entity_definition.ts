/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, SavedObjectsClient, SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { EntityDefinition } from '../../common/types';
import { OBSERVABILITY_ENTITY_DEFINITIONS } from '../../common/saved_object_contants';

export interface EntityDefinitionSavedObject {
  groups: EntityDefinition[];
}

const entityDefinitionMapping: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    groups: {
      type: 'nested',
      dynamic: false,
      properties: {
        id: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
        stability: {
          type: 'keyword',
        },
        name: {
          type: 'keyword',
        },
        query: {
          type: 'text',
        },
        brief: {
          type: 'text',
        },
        attributes: {
          type: 'nested',
          dynamic: false,
          properties: {
            ref: {
              type: 'keyword',
            },
            requirement_level: {
              type: 'keyword',
            },
          },
        },
        // not part of semconv
        relationships: {
          type: 'nested',
          dynamic: false,
          properties: {
            type: {
              type: 'keyword',
            },
            target: {
              type: 'keyword',
            },
            brief: {
              type: 'text',
            },
            attribute_mapping: {
              type: 'object',
              dynamic: false,
              properties: {
                source_attribute: { type: 'keyword' },
                target_attribute: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
  },
};

export const observabilityEntityDefinitions: SavedObjectsType = {
  name: OBSERVABILITY_ENTITY_DEFINITIONS,
  hidden: false,
  namespaceType: 'multiple',
  mappings: entityDefinitionMapping,
  management: {
    importableAndExportable: true,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.entityDefinitions.overrides.title', {
        defaultMessage: 'Entity definition',
      }),
  },
};

export async function createEntityDefinitions(core: CoreSetup) {
  const [coreStart] = await core.getStartServices();

  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );

  await Promise.all([
    savedObjectsClient.create<EntityDefinitionSavedObject>(
      OBSERVABILITY_ENTITY_DEFINITIONS,
      {
        groups: [
          {
            id: 'entity.k8s.cluster',
            type: 'entity',
            stability: 'development',
            name: 'k8s.cluster',
            brief: 'A Kubernetes Cluster.',
            attributes: [{ ref: 'k8s.cluster.name' }, { ref: 'k8s.cluster.uid' }],
          },
          {
            id: 'entity.k8s.node',
            type: 'entity',
            stability: 'development',
            name: 'k8s.node',
            brief: 'A Kubernetes Node object.',
            attributes: [
              { ref: 'k8s.node.name' },
              { ref: 'k8s.node.uid' },
              { ref: 'k8s.node.label', requirement_level: 'opt_in' },
              { ref: 'k8s.node.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.cluster',
                brief: 'The cluster this node belongs to.',
              },
            ],
          },
          {
            id: 'entity.k8s.namespace',
            type: 'entity',
            stability: 'development',
            name: 'k8s.namespace',
            brief: 'A Kubernetes Namespace.',
            attributes: [
              { ref: 'k8s.namespace.name' },
              { ref: 'k8s.namespace.label', requirement_level: 'opt_in' },
              { ref: 'k8s.namespace.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.cluster',
                brief: 'The cluster this namespace belongs to.',
              },
            ],
          },
          {
            id: 'entity.k8s.pod',
            type: 'entity',
            stability: 'development',
            name: 'k8s.pod',
            brief: 'A Kubernetes Pod object.',
            attributes: [
              { ref: 'k8s.pod.uid' },
              { ref: 'k8s.pod.name' },
              { ref: 'k8s.pod.label', requirement_level: 'opt_in' },
              { ref: 'k8s.pod.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'scheduled_on',
                target: 'entity.k8s.node',
                brief: 'The node this pod is scheduled on.',
                attribute_mapping: {
                  source_attribute: 'k8s.pod.node.name',
                  target_attribute: 'k8s.node.name',
                },
              },
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this pod belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.pod.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.container',
            type: 'entity',
            stability: 'development',
            name: 'k8s.container',
            brief:
              'A container in a [PodTemplate](https://kubernetes.io/docs/concepts/workloads/pods/#pod-templates).',
            attributes: [
              { ref: 'k8s.container.name' },
              { ref: 'k8s.container.restart_count' },
              { ref: 'k8s.container.status.last_terminated_reason' },
            ],
            relationships: [
              {
                type: 'part_of',
                target: 'entity.k8s.pod',
                brief: 'The pod this container is part of.',
                attribute_mapping: {
                  source_attribute: 'k8s.container.pod.uid',
                  target_attribute: 'k8s.pod.uid',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.replicaset',
            type: 'entity',
            stability: 'development',
            name: 'k8s.replicaset',
            brief: 'A Kubernetes ReplicaSet object.',
            attributes: [
              { ref: 'k8s.replicaset.uid' },
              { ref: 'k8s.replicaset.name' },
              { ref: 'k8s.replicaset.label', requirement_level: 'opt_in' },
              { ref: 'k8s.replicaset.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'managed_by',
                target: 'entity.k8s.deployment',
                brief: 'The deployment managing this ReplicaSet.',
                attribute_mapping: {
                  source_attribute: 'k8s.replicaset.owner.name',
                  target_attribute: 'k8s.deployment.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.deployment',
            type: 'entity',
            stability: 'development',
            name: 'k8s.deployment',
            brief: 'A Kubernetes Deployment object.',
            attributes: [
              { ref: 'k8s.deployment.uid' },
              { ref: 'k8s.deployment.name' },
              { ref: 'k8s.deployment.label', requirement_level: 'opt_in' },
              { ref: 'k8s.deployment.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this deployment belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.deployment.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.statefulset',
            type: 'entity',
            stability: 'development',
            name: 'k8s.statefulset',
            brief: 'A Kubernetes StatefulSet object.',
            attributes: [
              { ref: 'k8s.statefulset.uid' },
              { ref: 'k8s.statefulset.name' },
              { ref: 'k8s.statefulset.label', requirement_level: 'opt_in' },
              { ref: 'k8s.statefulset.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this statefulset belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.statefulset.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.daemonset',
            type: 'entity',
            stability: 'development',
            name: 'k8s.daemonset',
            brief: 'A Kubernetes DaemonSet object.',
            attributes: [
              { ref: 'k8s.daemonset.uid' },
              { ref: 'k8s.daemonset.name' },
              { ref: 'k8s.daemonset.label', requirement_level: 'opt_in' },
              { ref: 'k8s.daemonset.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this daemonset belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.daemonset.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.job',
            type: 'entity',
            stability: 'development',
            name: 'k8s.job',
            brief: 'A Kubernetes Job object.',
            attributes: [
              { ref: 'k8s.job.uid' },
              { ref: 'k8s.job.name' },
              { ref: 'k8s.job.label', requirement_level: 'opt_in' },
              { ref: 'k8s.job.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this job belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.job.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.cronjob',
            type: 'entity',
            stability: 'development',
            name: 'k8s.cronjob',
            brief: 'A Kubernetes CronJob object.',
            attributes: [
              { ref: 'k8s.cronjob.uid' },
              { ref: 'k8s.cronjob.name' },
              { ref: 'k8s.cronjob.label', requirement_level: 'opt_in' },
              { ref: 'k8s.cronjob.annotation', requirement_level: 'opt_in' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this cronjob belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.cronjob.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.replicationcontroller',
            type: 'entity',
            stability: 'development',
            name: 'k8s.replicationcontroller',
            brief: 'A Kubernetes ReplicationController object.',
            attributes: [
              { ref: 'k8s.replicationcontroller.uid' },
              { ref: 'k8s.replicationcontroller.name' },
            ],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this replicationcontroller belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.replicationcontroller.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          {
            id: 'entity.k8s.hpa',
            type: 'entity',
            stability: 'development',
            name: 'k8s.hpa',
            brief: 'A Kubernetes HorizontalPodAutoscaler object.',
            attributes: [
              { ref: 'k8s.hpa.uid' },
              { ref: 'k8s.hpa.name' },
              { ref: 'k8s.hpa.scaletargetref.kind', requirement_level: 'recommended' },
              { ref: 'k8s.hpa.scaletargetref.name', requirement_level: 'recommended' },
              { ref: 'k8s.hpa.scaletargetref.api_version', requirement_level: 'recommended' },
            ],
          },
          {
            id: 'entity.k8s.resourcequota',
            type: 'entity',
            stability: 'development',
            name: 'k8s.resourcequota',
            brief: 'A Kubernetes ResourceQuota object.',
            attributes: [{ ref: 'k8s.resourcequota.uid' }, { ref: 'k8s.resourcequota.name' }],
            relationships: [
              {
                type: 'belongs_to',
                target: 'entity.k8s.namespace',
                brief: 'The namespace this resourcequota belongs to.',
                attribute_mapping: {
                  source_attribute: 'k8s.resourcequota.namespace',
                  target_attribute: 'k8s.namespace.name',
                },
              },
            ],
          },
          // k8s.volume and k8s.service are not included in the entity definitions
        ],
      },
      {
        id: 'kubernetes',
        overwrite: true,
      }
    ),
  ]);
}
