/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ExplorerState } from './state';

// Set the KQL query bar placeholder value
export const setKqlQueryBarPlaceholder = (state: ExplorerState) => {
  const { influencers, noInfluencersConfigured } = state;

  if (influencers !== undefined && !noInfluencersConfigured) {
    for (const influencerName in influencers) {
      if (influencers[influencerName][0] && influencers[influencerName][0].influencerFieldValue) {
        return {
          filterPlaceHolder: i18n.translate('xpack.ml.explorer.kueryBar.filterPlaceholder', {
            defaultMessage: 'Filter by influencer fields… ({queryExample})',
            values: {
              queryExample: `${influencerName} : ${influencers[influencerName][0].influencerFieldValue}`,
            },
          }),
        };
      }
    }
  }

  return {};
};
