/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { indexBy, isString } from 'lodash';
import { callWithRequestFactory } from '../call_with_request_factory';
import { mergeCapabilitiesWithFields } from '../merge_capabilities_with_fields';
import { getCapabilitiesForRollupIndices } from '../map_capabilities';

const ROLLUP_INDEX_CAPABILITIES_METHOD = 'rollup.rollupIndexCapabilities';

const getRollupIndices = rollupData => Object.keys(rollupData);

const isIndexPatternContainsWildcard = indexPattern => indexPattern.includes('*');
const isIndexPatternValid = indexPattern =>
  indexPattern && isString(indexPattern) && !isIndexPatternContainsWildcard(indexPattern);

export const getRollupSearchStrategy = (
  AbstractSearchStrategy,
  RollupSearchRequest,
  RollupSearchCapabilities
) =>
  class RollupSearchStrategy extends AbstractSearchStrategy {
    name = 'rollup';

    constructor(server) {
      super(server, callWithRequestFactory, RollupSearchRequest);
    }

    getRollupData(req, indexPattern) {
      const callWithRequest = this.getCallWithRequestInstance(req);

      return callWithRequest(ROLLUP_INDEX_CAPABILITIES_METHOD, {
        indexPattern,
      }).catch(() => Promise.resolve({}));
    }

    async checkForViability(req, indexPattern) {
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

    async getFieldsForWildcard(req, indexPattern, { fieldsCapabilities, rollupIndex }) {
      const fields = await super.getFieldsForWildcard(req, indexPattern);
      const fieldsFromFieldCapsApi = indexBy(fields, 'name');
      const rollupIndexCapabilities = fieldsCapabilities[rollupIndex].aggs;

      return mergeCapabilitiesWithFields(rollupIndexCapabilities, fieldsFromFieldCapsApi);
    }
  };
