/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import type {
  ObservabilityInvestigationAppMenuParams,
  ObservabilityInvestigationDocumentDeps,
} from '@kbn/discover-shared-plugin/public';
import { getEbtProps } from '@kbn/ebt-click';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  MAX_INVESTIGATION_FIELD_CHARS,
  MAX_INVESTIGATION_FILTERS,
  MAX_INVESTIGATION_TEXT_CHARS,
  type InvestigationSeed,
  extractDocumentSeed,
  extractSeedEntities,
  isEsqlQuery,
} from '@kbn/investigation-seed';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import React, { useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { OpenInvestigationOptions } from '../plugin';
import { reportSignalInvestigationShown } from '../telemetry/shown_telemetry';

const findRelatedChangesLabel = (): string =>
  i18n.translate('xpack.signalInvestigation.actions.findRelatedChanges', {
    defaultMessage: 'Find related changes',
  });

const asBoundedField = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= MAX_INVESTIGATION_FIELD_CHARS ? trimmed : undefined;
};

const asBoundedText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= MAX_INVESTIGATION_TEXT_CHARS ? trimmed : undefined;
};

const nonEmptyQuery = (
  query: Query | AggregateQuery | undefined
): Query | AggregateQuery | undefined => {
  if (!query) {
    return undefined;
  }
  if (isEsqlQuery(query)) {
    return query.esql.trim().length > 0 ? query : undefined;
  }
  if (typeof query.query === 'string') {
    return query.query.trim().length > 0 ? query : undefined;
  }
  return query;
};

/** Builds an `InvestigationSeed` for the Discover app menu action. */
export const buildDiscoverAppMenuSeed = ({
  timeRange,
  filters = [],
  query,
  dataViewId,
  indexPattern,
}: ObservabilityInvestigationAppMenuParams): InvestigationSeed | undefined => {
  if (!timeRange?.from || !timeRange?.to) {
    return undefined;
  }

  const boundedFilters = filters.slice(0, MAX_INVESTIGATION_FILTERS);
  const effectiveQuery = nonEmptyQuery(query);
  const isEsql = Boolean(effectiveQuery && isEsqlQuery(effectiveQuery));
  const boundedDataViewId = isEsql ? undefined : asBoundedField(dataViewId);
  const boundedIndexPattern = asBoundedText(indexPattern);

  return {
    origin: { app: 'discover', surface: 'appMenu' },
    timeRange: { from: timeRange.from, to: timeRange.to },
    ...(effectiveQuery ? { query: effectiveQuery } : {}),
    filters: boundedFilters,
    ...(boundedDataViewId ? { dataViewId: boundedDataViewId } : {}),
    ...(boundedIndexPattern ? { indexPattern: boundedIndexPattern } : {}),
    entities: extractSeedEntities({ filters: boundedFilters, query: effectiveQuery }),
  };
};

export const LogDocumentInvestigationAction = ({
  doc,
  dataView,
  licensing,
  openInvestigation,
}: ObservabilityInvestigationDocumentDeps & {
  licensing: LicensingPluginStart;
  openInvestigation: (options: OpenInvestigationOptions) => Promise<void>;
}) => {
  const license = useObservable(licensing.license$);
  const hasPlatinum = Boolean(license?.hasAtLeast('platinum'));
  const seed = hasPlatinum
    ? extractDocumentSeed({
        documentId: doc.raw._id ?? doc.id,
        flattened: doc.flattened,
        timestamp: dataView?.timeFieldName ? doc.flattened[dataView.timeFieldName] : undefined,
        dataViewId: dataView?.id,
        indexPattern: dataView?.getIndexPattern(),
      })
    : undefined;

  const hasSeed = Boolean(seed);

  useEffect(() => {
    if (hasSeed) {
      reportSignalInvestigationShown({ app: 'discover', surface: 'document' });
    }
  }, [doc.id, hasSeed]);

  if (!seed) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        size="s"
        iconType="magnify"
        flush="left"
        data-test-subj="discoverLogDocFindRelatedChanges"
        onClick={() => {
          void openInvestigation({ seed, session: 'inherit' });
        }}
        {...getEbtProps({
          action: 'findRelatedChanges',
          element: 'discoverLogDocumentOverview',
        })}
      >
        {findRelatedChangesLabel()}
      </EuiButtonEmpty>
      <EuiSpacer size="s" />
    </>
  );
};
