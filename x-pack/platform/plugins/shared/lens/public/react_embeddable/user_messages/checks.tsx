/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import React from 'react';
import { DOC_TYPE } from '../../../common/constants';
import type {
  IndexPatternMap,
  IndexPatternRef,
  SharingSavedObjectProps,
  UserMessage,
} from '../../types';
import type { LensApi } from '../types';
import type { MergedSearchContext } from '../expressions/merged_search_context';
import { MISSING_TIME_RANGE_ON_EMBEDDABLE, URL_CONFLICT } from '../../user_messages_ids';

export function hasLegacyURLConflict(metaInfo?: SharingSavedObjectProps, spaces?: SpacesApi) {
  return metaInfo?.outcome === 'conflict' && spaces?.ui?.components?.getEmbeddableLegacyUrlConflict;
}

export function getLegacyURLConflictsMessage(
  metaInfo: SharingSavedObjectProps,
  spaces: SpacesApi
): UserMessage {
  const LegacyURLConfig = spaces.ui.components.getEmbeddableLegacyUrlConflict;
  return {
    uniqueId: URL_CONFLICT,
    severity: 'error',
    displayLocations: [{ id: 'visualization' }],
    shortMessage: i18n.translate('xpack.lens.legacyURLConflict.shortMessage', {
      defaultMessage: `You've encountered a URL conflict`,
    }),
    longMessage: <LegacyURLConfig targetType={DOC_TYPE} sourceId={metaInfo.sourceId!} />,
    fixableInEditor: false,
  };
}

export function isSearchContextIncompatibleWithDataViews(
  api: LensApi,
  context: { type?: string; id?: string } | undefined,
  searchContext: MergedSearchContext,
  indexPatternRefs: IndexPatternRef[],
  indexPatterns: IndexPatternMap
) {
  return (
    !api.isTextBasedLanguage() &&
    searchContext.timeRange == null &&
    indexPatternRefs.some(({ id }) => {
      const indexPattern = indexPatterns[id];
      return indexPattern?.timeFieldName && indexPattern.getFieldByName(indexPattern.timeFieldName);
    })
  );
}

export function getSearchContextIncompatibleMessage(): UserMessage {
  return {
    uniqueId: MISSING_TIME_RANGE_ON_EMBEDDABLE,
    severity: 'error',
    fixableInEditor: false,
    displayLocations: [{ id: 'visualization' }],
    shortMessage: i18n.translate('xpack.lens.missingTimeRangeParam.shortMessage', {
      defaultMessage: `Missing timeRange property`,
    }),
    longMessage: i18n.translate('xpack.lens.missingTimeRangeParam.longMessage', {
      defaultMessage: `The timeRange property is required for the given configuration`,
    }),
  };
}
