/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { flow, set, omit } from 'lodash/fp';

import { Logger } from '../../../../../../../../src/core/server';
import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { RuleTypeParams } from '../types';
import { singleBulkCreate } from './single_bulk_create';
import { Influencer } from '../../../../public/components/ml/types';

interface Anomaly {
  job_id: string;
  record_score: number;
  timestamp: number;
  by_field_name: string;
  by_field_value: string;
  influencers?: Influencer[];
}

type AnomalyResults = SearchResponse<Anomaly>;

interface BulkCreateMlSignalsParams {
  someResult: AnomalyResults;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  id: string;
  signalsIndex: string;
  name: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  tags: string[];
}

const convertAnomalyFieldsToECS = (anomaly: Anomaly): Anomaly => {
  const {
    by_field_name: entityName,
    by_field_value: entityValue,
    influencers: maybeInfluencers,
  } = anomaly;
  const influencers = maybeInfluencers ?? [];

  const setEntityField = set(entityName, entityValue);
  const setInfluencerFields = influencers.map(influencer =>
    set(influencer.influencer_field_name, influencer.influencer_field_values)
  );
  const omitDottedFields = omit([
    entityName,
    ...influencers.map(influencer => influencer.influencer_field_name),
  ]);

  return flow(omitDottedFields, setEntityField, setInfluencerFields)(anomaly);
};

export const bulkCreateMlSignals = async (params: BulkCreateMlSignalsParams) => {
  const anomalies = params.someResult;
  anomalies.hits.hits = anomalies.hits.hits.map(({ _source, ...rest }) => ({
    ...rest,
    _source: convertAnomalyFieldsToECS(_source),
  }));

  return singleBulkCreate({ ...params, someResult: anomalies });
};
