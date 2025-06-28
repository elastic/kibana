/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { AnonymizationOutput, AnonymizationRule, Message } from '@kbn/inference-common';
import { merge } from 'lodash';
import { anonymizeRecords } from './anonymize_records';
import { messageFromAnonymizationRecords } from './message_from_anonymization_records';
import { messageToAnonymizationRecords } from './message_to_anonymization_records';

export async function anonymizeMessages({
  messages,
  anonymizationRules,
  esClient,
}: {
  messages: Message[];
  anonymizationRules: AnonymizationRule[];
  esClient: ElasticsearchClient;
}): Promise<AnonymizationOutput> {
  const rules = anonymizationRules.filter((rule) => rule.enabled);
  if (!rules.length) {
    return {
      messages,
      anonymizations: [],
    };
  }

  const toAnonymize = messages.map(messageToAnonymizationRecords);

  const { records, anonymizations } = await anonymizeRecords({
    input: toAnonymize,
    anonymizationRules: rules,
    esClient,
  });

  const anonymizedMessages = messages.map((original, index) => {
    const map = records[index];

    return merge({}, original, messageFromAnonymizationRecords(map));
  });

  return {
    messages: anonymizedMessages,
    anonymizations,
  };
}
