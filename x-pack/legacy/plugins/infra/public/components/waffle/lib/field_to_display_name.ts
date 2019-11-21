/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

interface Lookup {
  [id: string]: string;
}

const availabilityZoneName = i18n.translate('xpack.infra.groupByDisplayNames.availabilityZone', {
  defaultMessage: 'Availability zone',
});

const machineTypeName = i18n.translate('xpack.infra.groupByDisplayNames.machineType', {
  defaultMessage: 'Machine type',
});

export const fieldToName = (field: string) => {
  const LOOKUP: Lookup = {
    'kubernetes.namespace': i18n.translate('xpack.infra.groupByDisplayNames.kubernetesNamespace', {
      defaultMessage: 'Namespace',
    }),
    'kubernetes.node.name': i18n.translate('xpack.infra.groupByDisplayNames.kubernetesNodeName', {
      defaultMessage: 'Node',
    }),
    'host.name': i18n.translate('xpack.infra.groupByDisplayNames.hostName', {
      defaultMessage: 'Host',
    }),
    'cloud.availability_zone': availabilityZoneName,
    'cloud.machine.type': machineTypeName,
    'cloud.project.id': i18n.translate('xpack.infra.groupByDisplayNames.projectID', {
      defaultMessage: 'Project ID',
    }),
    'cloud.provider': i18n.translate('xpack.infra.groupByDisplayNames.provider', {
      defaultMessage: 'Cloud provider',
    }),
    'service.type': i18n.translate('xpack.infra.groupByDisplayNames.serviceType', {
      defaultMessage: 'Service type',
    }),
    'aws.cloud.availability_zone': availabilityZoneName,
    'aws.cloud.machine.type': machineTypeName,
    'aws.tags': i18n.translate('xpack.infra.groupByDisplayNames.tags', {
      defaultMessage: 'Tags',
    }),
    'aws.ec2.instance.image.id': i18n.translate('xpack.infra.groupByDisplayNames.image', {
      defaultMessage: 'Image',
    }),
    'aws.ec2.instance.state.name': i18n.translate('xpack.infra.groupByDisplayNames.state.name', {
      defaultMessage: 'State',
    }),
    'cloud.region': i18n.translate('xpack.infra.groupByDisplayNames.cloud.region', {
      defaultMessage: 'Region',
    }),
    'aws.rds.db_instance.class': i18n.translate(
      'xpack.infra.groupByDisplayNames.rds.db_instance.class',
      {
        defaultMessage: 'Instance Class',
      }
    ),
    'aws.rds.db_instance.status': i18n.translate(
      'xpack.infra.groupByDisplayNames.rds.db_instance.status',
      {
        defaultMessage: 'Status',
      }
    ),
  };
  return LOOKUP[field] || field;
};
