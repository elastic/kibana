/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { DEPRECATED_ALERTING_CONSUMERS } from '@kbn/rule-data-utils';
import type { RuleTypeWithDescription } from '../common/types';

export const getAuthorizedConsumers = ({
  ruleType,
  validConsumers,
}: {
  ruleType: RuleTypeWithDescription;
  validConsumers: RuleCreationValidConsumer[];
}) => {
  return Object.entries(ruleType.authorizedConsumers)
    .reduce<RuleCreationValidConsumer[]>((result, [authorizedConsumer, privilege]) => {
      if (
        privilege.all &&
        validConsumers.includes(authorizedConsumer as RuleCreationValidConsumer)
      ) {
        result.push(authorizedConsumer as RuleCreationValidConsumer);
      }
      return result;
    }, [])
    .filter((consumer) => {
      // Filter out deprecated alerting consumers
      return !(DEPRECATED_ALERTING_CONSUMERS as RuleCreationValidConsumer[]).includes(
        consumer as RuleCreationValidConsumer
      );
    });
};
