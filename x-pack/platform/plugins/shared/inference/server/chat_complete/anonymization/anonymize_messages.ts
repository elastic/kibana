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
import { RegexWorkerService } from './regex_worker_service';

export async function anonymizeMessages({
  system,
  messages,
  anonymizationRules,
  regexWorker,
  esClient,
}: {
  system?: string | undefined;
  messages: Message[];
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
}): Promise<AnonymizationOutput> {
  const rules = anonymizationRules.filter((rule) => rule.enabled);
  if (!rules.length) {
    return {
      messages,
      anonymizations: [],
    };
  }

  const toAnonymize = [
    ...messages.map(messageToAnonymizationRecords),
    // put system message last so we can use position-based lookups
    // when iterating over `records`
    ...(system ? [{ system }] : []),
  ];

  const { records, anonymizations } = await anonymizeRecords({
    input: toAnonymize,
    anonymizationRules: rules,
    regexWorker,
    esClient,
  });

  const anonymizedMessages = messages.map((original, index) => {
    const map = records[index];

    return merge({}, original, messageFromAnonymizationRecords(map));
  });

  const anonymizedSystem = records.find((r) => 'system' in r) as { system?: string } | undefined;

  return {
    system: anonymizedSystem?.system,
    messages: anonymizedMessages,
    anonymizations,
  };
}
