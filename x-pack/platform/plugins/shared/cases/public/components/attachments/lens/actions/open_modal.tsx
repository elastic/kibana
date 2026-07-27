/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import type { LensApi, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isOfAggregateQueryType, isOfQueryType } from '@kbn/es-query';
import type { Query, AggregateQuery } from '@kbn/es-query';
import {
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { ActionWrapper } from './action_wrapper';
import type { CasesActionContextProps, Services } from './types';
import type { CaseUI } from '../../../../../common';
import { getLensCaseAttachment } from './utils';
import { useCasesAddToExistingCaseModal } from '../../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { convertToAbsoluteTimeRange } from './convert_to_absolute_time_range';

interface Props {
  lensApi: LensApi;
  onSuccess: () => void;
  onClose: (theCase?: CaseUI) => void;
  services: Services;
}

// A parent unified-search context conventionally publishes the query-service
// default (`{ query: '', language: 'kuery' }`) even when the page search bar
// is empty, which is truthy but carries no information. Lens's own merge
// logic (`getMergedSearchContext`) also excludes ES|QL/aggregate queries,
// since those can't be combined with a form-based Lens's own query. Only a
// non-empty, non-aggregate parent query is worth applying here.
const getEffectiveParentQuery = (query: Query | AggregateQuery | undefined): Query | undefined => {
  if (!query || isOfAggregateQueryType(query) || !isOfQueryType(query) || !query.query) {
    return undefined;
  }
  return query;
};

// The Lens attributes only carry the filters/query set inside the Lens
// editor's own filter bar. A filter added by clicking a chart element (or a
// query typed into the surrounding page's search bar) lives on the parent's
// unified search context instead, so we merge it in here, similar to how
// Lens merges the dashboard's search context with its own at render time.
// Unlike Lens -- which keeps the panel's own query and prepends the parent's
// into an array -- the case attachment only has a single `state.query`, so
// we only apply the parent's query when it would add something; otherwise
// the panel's own saved query is preserved.
const getAttributesWithParentSearchContext = (
  lensApi: LensApi,
  services: Services
): LensSavedObjectAttributes | undefined => {
  const attributes = lensApi.getFullAttributes();
  if (!attributes || !apiPublishesUnifiedSearch(lensApi.parentApi)) {
    return attributes;
  }

  const parentFilters =
    lensApi.parentApi.filters$.getValue()?.filter(({ meta }) => !meta?.disabled) ?? [];
  const parentQuery = getEffectiveParentQuery(lensApi.parentApi.query$.getValue());

  if (!parentFilters.length && !parentQuery) {
    return attributes;
  }

  const { state: extractedFilters, references: filterReferences } = parentFilters.length
    ? services.plugins.data.query.filterManager.extract(parentFilters)
    : { state: [], references: [] };

  return {
    ...attributes,
    references: [...attributes.references, ...filterReferences],
    state: {
      ...attributes.state,
      ...(parentQuery ? { query: parentQuery } : {}),
      // `state.filters` is typed as required, but older saved Lens panels can
      // lack it at runtime -- Lens's own `getMergedSearchContext` guards the
      // same access with `|| []` (see merged_search_context.ts).
      filters: [...extractedFilters, ...(attributes.state.filters ?? [])],
    },
  };
};

const AddExistingCaseModalWrapper: React.FC<Props> = ({
  lensApi,
  onClose,
  onSuccess,
  services,
}) => {
  const modal = useCasesAddToExistingCaseModal({
    onClose,
    onSuccess,
  });

  const timeRange = useStateFromPublishingSubject(lensApi.timeRange$);
  const parentTimeRange = useStateFromPublishingSubject(
    apiPublishesTimeRange(lensApi.parentApi)
      ? lensApi.parentApi?.timeRange$
      : new BehaviorSubject(undefined)
  );
  const absoluteTimeRange = convertToAbsoluteTimeRange(timeRange);
  const absoluteParentTimeRange = convertToAbsoluteTimeRange(parentTimeRange);

  const attachments = useMemo(() => {
    const appliedTimeRange = absoluteTimeRange ?? absoluteParentTimeRange;
    const attributes = getAttributesWithParentSearchContext(lensApi, services);

    return !attributes || !appliedTimeRange
      ? []
      : [
          getLensCaseAttachment({
            attributes,
            timeRange: appliedTimeRange,
            // Pass the Lens chart description (e.g. entity identity such as "host: web-server-1")
            // as metadata so Cases can surface it alongside the attachment.
            metadata: attributes.description ? { description: attributes.description } : undefined,
          }),
        ];
  }, [lensApi, services, absoluteTimeRange, absoluteParentTimeRange]);

  useEffect(() => {
    modal.open({ getAttachments: () => attachments });
  }, [attachments, modal]);

  return null;
};
AddExistingCaseModalWrapper.displayName = 'AddExistingCaseModalWrapper';

export function openModal(
  lensApi: LensApi,
  currentAppId: string | undefined,
  casesActionContextProps: CasesActionContextProps,
  services: Services
) {
  const targetDomElement = document.createElement('div');

  const cleanupDom = (shouldCleanup?: boolean) => {
    if (targetDomElement != null && shouldCleanup) {
      unmountComponentAtNode(targetDomElement);
    }
  };

  const onClose = (theCase?: CaseUI, isCreateCase?: boolean) => {
    const closeModalClickedScenario = theCase == null && !isCreateCase;
    const caseSelectedScenario = theCase != null;
    // When `Creating` a case from the `add to existing case modal`,
    // we close the modal and then open the flyout.
    // If we clean up dom when closing the modal, then the flyout won't open.
    // Thus we do not clean up dom when `Creating` a case.
    const shouldCleanup = closeModalClickedScenario || caseSelectedScenario;
    cleanupDom(shouldCleanup);
  };

  const onSuccess = () => {
    cleanupDom(true);
  };
  const mount = toMountPoint(
    <ActionWrapper
      casesActionContextProps={casesActionContextProps}
      currentAppId={currentAppId}
      services={services}
    >
      <AddExistingCaseModalWrapper
        lensApi={lensApi}
        onClose={onClose}
        onSuccess={onSuccess}
        services={services}
      />
    </ActionWrapper>,
    services.core
  );

  mount(targetDomElement);
}
