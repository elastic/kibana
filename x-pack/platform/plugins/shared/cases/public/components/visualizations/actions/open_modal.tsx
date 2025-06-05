/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { TimeRange, Query } from '@kbn/es-query';
import { unmountComponentAtNode } from 'react-dom';
import { isLensApi } from '@kbn/lens-plugin/public';
import { isSavedSearchApi } from '@kbn/discover-contextual-components/src/actions/saved_search_compatibility_check';
import type { LensApi } from '@kbn/lens-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { type SearchEmbeddableApi } from '@kbn/discover-utils';
import { apiPublishesTimeRange, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { ActionWrapper } from './action_wrapper';
import type { CasesActionContextProps, Services } from './types';
import type { CaseUI } from '../../../../common';
import { getLensCaseAttachment, getSavedSearchCaseAttachment } from './utils';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { convertToAbsoluteTimeRange } from './convert_to_absolute_time_range';
interface Props {
  api: LensApi | SearchEmbeddableApi;
  onSuccess: () => void;
  onClose: (theCase?: CaseUI) => void;
}

const getAttachments = ({
  api,
  timeRange,
  parentTimeRange,
}: {
  api: LensApi | SearchEmbeddableApi;
  timeRange?: TimeRange;
  parentTimeRange?: TimeRange;
}) => {
  const absoluteTimeRange = convertToAbsoluteTimeRange(timeRange);
  const absoluteParentTimeRange = convertToAbsoluteTimeRange(parentTimeRange);
  const appliedTimeRange = absoluteTimeRange ?? absoluteParentTimeRange;

  if (isLensApi(api)) {
    const attributes = api.getFullAttributes();
    return !attributes || !absoluteTimeRange
      ? []
      : [getLensCaseAttachment({ attributes, timeRange: appliedTimeRange })];
  }
  if (isSavedSearchApi(api)) {
    const dataView = api.dataViews$.getValue()?.[0] || {};
    const indexPattern = dataView.getIndexPattern();
    const timestampField = dataView.timeFieldName;
    const query = api.query$.getValue() as Query | undefined;
    const filters = api.filters$.getValue() || [];
    const parentQuery = api.parentApi?.query$.getValue() as Query | undefined;
    const parentFilters = api.parentApi?.filters$.getValue() || [];

    return [
      getSavedSearchCaseAttachment({
        index: indexPattern,
        timeRange: appliedTimeRange,
        timestampField,
        filters,
        parentFilters,
        query,
        parentQuery,
      }),
    ];
  }
  return [];
};

const AddExistingCaseModalWrapper: React.FC<Props> = ({ api, onClose, onSuccess }) => {
  const modal = useCasesAddToExistingCaseModal({
    onClose,
    onSuccess,
  });

  const timeRange = useStateFromPublishingSubject(api.timeRange$);
  const parentTimeRange = useStateFromPublishingSubject(
    apiPublishesTimeRange(api.parentApi)
      ? api.parentApi?.timeRange$
      : new BehaviorSubject(undefined)
  );
  const absoluteTimeRange = convertToAbsoluteTimeRange(timeRange);
  const absoluteParentTimeRange = convertToAbsoluteTimeRange(parentTimeRange);

  const attachments = useMemo(() => {
    return getAttachments({
      api,
      timeRange: absoluteTimeRange,
      parentTimeRange: absoluteParentTimeRange,
    });
  }, [api, absoluteTimeRange, absoluteParentTimeRange]);

  useEffect(() => {
    modal.open({ getAttachments: () => attachments });
  }, [attachments, modal]);

  return null;
};
AddExistingCaseModalWrapper.displayName = 'AddExistingCaseModalWrapper';

export function openModal(
  api: LensApi | SearchEmbeddableApi,
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
      <AddExistingCaseModalWrapper api={api} onClose={onClose} onSuccess={onSuccess} />
    </ActionWrapper>,
    services.core
  );

  mount(targetDomElement);
}
