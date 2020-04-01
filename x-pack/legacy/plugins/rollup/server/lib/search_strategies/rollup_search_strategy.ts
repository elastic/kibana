/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { indexBy, isString } from 'lodash';
import { ElasticsearchServiceSetup, KibanaRequest } from 'kibana/server';
import { callWithRequestFactory } from '../call_with_request_factory';
import { mergeCapabilitiesWithFields } from '../merge_capabilities_with_fields';
import { getCapabilitiesForRollupIndices } from '../map_capabilities';

const ROLLUP_INDEX_CAPABILITIES_METHOD = 'rollup.rollupIndexCapabilities';

const getRollupIndices = (rollupData: { [key: string]: any[] }) => Object.keys(rollupData);

const isIndexPatternContainsWildcard = (indexPattern: string) => indexPattern.includes('*');
const isIndexPatternValid = (indexPattern: string) =>
  indexPattern && isString(indexPattern) && !isIndexPatternContainsWildcard(indexPattern);

export const getRollupSearchStrategy = (
  AbstractSearchStrategy: any,
  RollupSearchRequest: any,
  RollupSearchCapabilities: any
) =>
  class RollupSearchStrategy extends AbstractSearchStrategy {
    name = 'rollup';

    constructor(elasticsearchService: ElasticsearchServiceSetup) {
      super(elasticsearchService, callWithRequestFactory, RollupSearchRequest);
    }

    getRollupData(req: KibanaRequest, indexPattern: string) {
      const callWithRequest = this.getCallWithRequestInstance(req);

      return callWithRequest(ROLLUP_INDEX_CAPABILITIES_METHOD, {
        indexPattern,
      }).catch(() => Promise.resolve({}));
    }

    async checkForViability(req: KibanaRequest, indexPattern: string) {
      let isViable = false;
      let capabilities = null;

      if (isIndexPatternValid(indexPattern)) {
        const rollupData = await this.getRollupData(req, indexPattern);
        const rollupIndices = getRollupIndices(rollupData);

        isViable = rollupIndices.length === 1;

        if (isViable) {
          const [rollupIndex] = rollupIndices;
          const fieldsCapabilities = getCapabilitiesForRollupIndices(rollupData);

          capabilities = new RollupSearchCapabilities(req, fieldsCapabilities, rollupIndex);
        }
      }

      return {
        isViable,
        capabilities,
      };
    }

    async getFieldsForWildcard(
      req: KibanaRequest,
      indexPattern: string,
      {
        fieldsCapabilities,
        rollupIndex,
      }: { fieldsCapabilities: { [key: string]: any }; rollupIndex: string }
    ) {
      const fields = await super.getFieldsForWildcard(req, indexPattern);
      const fieldsFromFieldCapsApi = indexBy(fields, 'name');
      const rollupIndexCapabilities = fieldsCapabilities[rollupIndex].aggs;

      return mergeCapabilitiesWithFields(rollupIndexCapabilities, fieldsFromFieldCapsApi);
    }
  };
