/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';

import { RollupPrompt } from './components/rollup_prompt';
import { setHttpClient, getRollupIndices } from '../services/api';
import { IndexPatternCreationConfig } from '../../../../../../src/legacy/core_plugins/management/public';

const rollupIndexPatternTypeName = i18n.translate(
  'xpack.rollupJobs.editRollupIndexPattern.createIndex.defaultTypeName',
  { defaultMessage: 'rollup index pattern' }
);

const rollupIndexPatternButtonText = i18n.translate(
  'xpack.rollupJobs.editRollupIndexPattern.createIndex.defaultButtonText',
  { defaultMessage: 'Rollup index pattern' }
);

const rollupIndexPatternButtonDescription = i18n.translate(
  'xpack.rollupJobs.editRollupIndexPattern.createIndex.defaultButtonDescription',
  { defaultMessage: 'Perform limited aggregations against summarized data' }
);

const rollupIndexPatternNoMatchError = i18n.translate(
  'xpack.rollupJobs.editRollupIndexPattern.createIndex.noMatchError',
  { defaultMessage: 'Rollup index pattern error: must match one rollup index' }
);

const rollupIndexPatternTooManyMatchesError = i18n.translate(
  'xpack.rollupJobs.editRollupIndexPattern.createIndex.tooManyMatchesError',
  { defaultMessage: 'Rollup index pattern error: can only match one rollup index' }
);

const rollupIndexPatternIndexLabel = i18n.translate(
  'xpack.rollupJobs.editRollupIndexPattern.createIndex.indexLabel',
  { defaultMessage: 'Rollup' }
);

export class RollupIndexPatternCreationConfig extends IndexPatternCreationConfig {
  key = 'rollup';

  constructor(options) {
    super({
      type: 'rollup',
      name: rollupIndexPatternTypeName,
      showSystemIndices: false,
      isBeta: true,
      ...options,
    });

    setHttpClient(this.httpClient);
    this.rollupIndex = null;
    this.rollupJobs = [];
    this.rollupIndicesCapabilities = {};
    this.rollupIndices = [];
    this.settingUp = this.setRollupIndices();
  }

  async setRollupIndices() {
    try {
      // This is a hack intended to prevent the getRollupIndices() request from being sent if
      // we're on /logout. There is a race condition that can arise on that page, whereby this
      // request resolves after the logout request resolves, and un-clears the session ID.
      const isAnonymous = npSetup.core.http.anonymousPaths.isAnonymous(window.location.pathname);
      if (!isAnonymous) {
        this.rollupIndicesCapabilities = await getRollupIndices();
      }

      this.rollupIndices = Object.keys(this.rollupIndicesCapabilities);
    } catch (e) {
      // Silently swallow failure responses such as expired trials
    }
  }

  async getIndexPatternCreationOption(urlHandler) {
    await this.settingUp;
    return this.rollupIndices && this.rollupIndices.length
      ? {
          text: rollupIndexPatternButtonText,
          description: rollupIndexPatternButtonDescription,
          testSubj: `createRollupIndexPatternButton`,
          isBeta: this.isBeta,
          onClick: () => {
            urlHandler('/management/kibana/index_pattern?type=rollup');
          },
        }
      : null;
  }

  isRollupIndex = indexName => {
    return this.rollupIndices.includes(indexName);
  };

  getIndexTags(indexName) {
    return this.isRollupIndex(indexName)
      ? [
          {
            key: this.type,
            name: rollupIndexPatternIndexLabel,
          },
        ]
      : [];
  }

  checkIndicesForErrors = indices => {
    this.rollupIndex = null;

    if (!indices || !indices.length) {
      return;
    }

    const rollupIndices = indices.filter(index => this.isRollupIndex(index.name));

    if (!rollupIndices.length) {
      return [rollupIndexPatternNoMatchError];
    } else if (rollupIndices.length > 1) {
      return [rollupIndexPatternTooManyMatchesError];
    }

    const rollupIndexName = rollupIndices[0].name;
    const error = this.rollupIndicesCapabilities[rollupIndexName].error;

    if (error) {
      const errorMessage = i18n.translate(
        'xpack.rollupJobs.editRollupIndexPattern.createIndex.uncaughtError',
        {
          defaultMessage: 'Rollup index pattern error: {error}',
          values: {
            error,
          },
        }
      );
      return [errorMessage];
    }

    this.rollupIndex = rollupIndexName;
  };

  getIndexPatternMappings = () => {
    return this.rollupIndex
      ? {
          type: this.type,
          typeMeta: {
            params: {
              rollup_index: this.rollupIndex,
            },
            aggs: this.rollupIndicesCapabilities[this.rollupIndex].aggs,
          },
        }
      : {};
  };

  renderPrompt = () => {
    return <RollupPrompt />;
  };

  getFetchForWildcardOptions = () => {
    return {
      type: this.type,
      params: {
        rollup_index: this.rollupIndex,
      },
    };
  };
}
