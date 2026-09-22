/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LOCAL_ELASTICSEARCH_LABEL } from './destination_type_config';
import type { DestinationStorageKind, DestinationType } from './types';

/**
 * One entry per create-form choice. `available` types can be saved; the rest
 * still render their own form section so a future type is a registry row plus
 * a fields component.
 */
export interface DestinationTypeDefinition {
  storageKind: DestinationStorageKind;
  /** Unit `type` written when this choice is created. Absent until it can be saved. */
  unitType?: DestinationType;
  available: boolean;
  label: string;
  testSubject: string;
}

export const DESTINATION_TYPE_DEFINITIONS: readonly DestinationTypeDefinition[] = [
  {
    storageKind: 'local_elasticsearch',
    unitType: 'elasticsearch',
    available: true,
    label: LOCAL_ELASTICSEARCH_LABEL,
    testSubject: 'streamsCreateDestinationLocalElasticsearch',
  },
  {
    storageKind: 'external_storage',
    available: false,
    label: i18n.translate('xpack.streams.destinations.externalStorageLabel', {
      defaultMessage: 'External storage',
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
