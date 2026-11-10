/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LOCAL_ELASTICSEARCH_LABEL, REMOTE_ELASTICSEARCH_LABEL } from './destination_type_config';
import {
  REMOTE_ELASTICSEARCH_TYPE,
  type DestinationStorageKind,
  type DestinationType,
} from './types';

/**
 * One entry per create-form choice. Only `available` choices are shown in the
 * create modal. Unavailable choices stay registered, with their fields, until
 * they can be offered.
 */
export interface DestinationTypeDefinition {
  storageKind: DestinationStorageKind;
  /** Unit `type` written when this choice is created. Absent until it can be saved. */
  unitType?: DestinationType;
  available: boolean;
  label: string;
  description: string;
  badge?: string;
  testSubject: string;
}

export const DESTINATION_TYPE_DEFINITIONS: readonly DestinationTypeDefinition[] = [
  {
    storageKind: 'local_elasticsearch',
    unitType: 'elasticsearch',
    available: true,
    label: LOCAL_ELASTICSEARCH_LABEL,
    description: i18n.translate('xpack.streams.destinations.localElasticsearchDescription', {
      defaultMessage: 'Write to indexes in this deployment.',
    }),
    badge: i18n.translate('xpack.streams.destinations.localElasticsearchBadge', {
      defaultMessage: 'Most common',
    }),
    testSubject: 'streamsCreateDestinationLocalElasticsearch',
  },
  {
    storageKind: 'remote_elasticsearch',
    unitType: REMOTE_ELASTICSEARCH_TYPE,
    available: true,
    label: REMOTE_ELASTICSEARCH_LABEL,
    description: i18n.translate('xpack.streams.destinations.remoteElasticsearchDescription', {
      defaultMessage: 'Write to another Elasticsearch cluster using its endpoint and an API key.',
    }),
    testSubject: 'streamsCreateDestinationRemoteElasticsearch',
  },
  {
    storageKind: 'external_storage',
    unitType: 's3',
    available: true,
    label: i18n.translate('xpack.streams.destinations.externalStorageLabel', {
      defaultMessage: 'External storage',
    }),
    description: i18n.translate('xpack.streams.destinations.externalStorageDescription', {
      defaultMessage: 'Send data outside Elasticsearch to Amazon S3.',
    }),
    testSubject: 'streamsCreateDestinationExternalStorage',
  },
];

export const getDestinationTypeDefinition = (
  storageKind: DestinationStorageKind
): DestinationTypeDefinition => {
  const definition = DESTINATION_TYPE_DEFINITIONS.find(
    (entry) => entry.storageKind === storageKind
  );
  if (!definition) {
    throw new Error(`Unknown destination storage kind: ${storageKind}`);
  }
  return definition;
};
