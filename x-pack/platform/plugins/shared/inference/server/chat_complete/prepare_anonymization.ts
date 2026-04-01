/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationRule, ChatCompleteOptions } from '@kbn/inference-common';
import { anonymizeMessages } from './anonymization/anonymize_messages';
import type { RegexWorkerService } from './anonymization/regex_worker_service';

interface PrepareAnonymizationOptions {
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  system?: ChatCompleteOptions['system'];
  messages: ChatCompleteOptions['messages'];
}

export const prepareAnonymization = async ({
  anonymizationRules,
  regexWorker,
  esClient,
  system,
  messages,
}: PrepareAnonymizationOptions) => {
  const anonymization = await anonymizeMessages({
    system,
    messages,
    anonymizationRules,
    regexWorker,
    esClient,
  });
  return { anonymization };
};
