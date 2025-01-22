/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { OWNER_INFO } from '../constants';
import type { Owner } from '../constants/types';

export const isValidOwner = (owner: string): owner is keyof typeof OWNER_INFO =>
  Object.keys(OWNER_INFO).includes(owner);

export const getCaseOwnerByAppId = (currentAppId?: string) =>
  Object.values(OWNER_INFO).find((info) => info.appId === currentAppId)?.id;

export const getOwnerFromRuleConsumerProducer = ({
  consumer,
  producer,
  isServerlessSecurity,
}: {
  consumer?: string;
  producer?: string;
  isServerlessSecurity?: boolean;
}): Owner => {
  // This is a workaround for a very specific bug with the cases action in serverless security
  // More info here: https://github.com/elastic/kibana/issues/186270
  if (isServerlessSecurity) {
    return OWNER_INFO.securitySolution.id;
  }

  // Fallback to producer if the consumer is alerts
  const consumerValue = consumer === AlertConsumers.ALERTS ? producer : consumer;

  for (const value of Object.values(OWNER_INFO)) {
    const foundConsumer = value.validRuleConsumers?.find(
      (validConsumer) => validConsumer === consumerValue || validConsumer === producer
    );

    if (foundConsumer) {
      return value.id;
    }
  }

  return OWNER_INFO.cases.id;
};
