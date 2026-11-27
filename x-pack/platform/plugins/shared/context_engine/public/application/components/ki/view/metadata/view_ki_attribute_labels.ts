/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  LAST_SEEN_AT_ATTRIBUTE,
  OCCURRENCES_ATTRIBUTE,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_RELATION_ATTRIBUTE,
} from '../../../../../../common/dreaming';

/** Readable labels of the attributes dreaming writes. Other keys are shown as they are. */
const ATTRIBUTE_LABELS: Readonly<Record<string, string>> = {
  [OCCURRENCES_ATTRIBUTE]: i18n.translate('xpack.contextEngine.viewKi.attributes.occurrences', {
    defaultMessage: 'Occurrences',
  }),
  [LAST_SEEN_AT_ATTRIBUTE]: i18n.translate('xpack.contextEngine.viewKi.attributes.lastSeen', {
    defaultMessage: 'Last seen',
  }),
  [RELATIONSHIP_RELATION_ATTRIBUTE]: i18n.translate(
    'xpack.contextEngine.viewKi.attributes.relation',
    { defaultMessage: 'Relation' }
  ),
};

/** Attributes whose value is a date and is shown formatted. */
const DATE_ATTRIBUTE_KEYS: readonly string[] = [LAST_SEEN_AT_ATTRIBUTE];

/** Attributes that are internal bookkeeping and are not shown. */
const HIDDEN_ATTRIBUTE_KEYS: readonly string[] = [RELATIONSHIP_KEY_ATTRIBUTE];

export const getKiAttributeLabel = (key: string): string =>
  Object.hasOwn(ATTRIBUTE_LABELS, key) ? ATTRIBUTE_LABELS[key] : key;

export const isKiDateAttribute = (key: string): boolean => DATE_ATTRIBUTE_KEYS.includes(key);

export const isKiHiddenAttribute = (key: string): boolean => HIDDEN_ATTRIBUTE_KEYS.includes(key);
