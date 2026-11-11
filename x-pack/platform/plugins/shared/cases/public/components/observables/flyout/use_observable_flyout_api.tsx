/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import type { ComponentType } from 'react';
import type { EuiFlyoutMenuProps } from '@elastic/eui';
import { copyToClipboard } from '@elastic/eui';
import type { ObservableWithMetadata } from '../../../../common/types/api';
import type { CaseUI } from '../../../../common/ui/types';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { useCaseViewNavigation } from '../../../common/navigation/hooks';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { ObservableFlyoutProperties } from './constants';
import {
  OBSERVABLE_FLYOUT_PROPERTIES,
  OBSERVABLE_LINK_PARAMS,
  OBSERVABLE_TOOL_FLYOUT_PROPERTIES,
} from './constants';
import { ObservableFlyoutProviders, useObservableFlyoutContext } from './flyout_providers';
import {
  COPY_LINK,
  formatFlyoutTitle,
  LINK_COPIED,
  OBSERVABLE_CASES_TITLE,
  OBSERVABLE_TITLE,
} from './translations';

const ObservableFlyout = lazy(() =>
  import('./main').then(({ ObservableFlyout: Component }) => ({ default: Component }))
);

const ObservableCasesTool = lazy(() =>
  import('./tools/cases').then(({ ObservableCasesTool: Component }) => ({ default: Component }))
);

export interface OpenObservableFlyoutParams {
  observable: ObservableWithMetadata;
  /** The case the observable was opened from; the panels act on it. */
  caseData: CaseUI;
  /** The label of the observable's type, shown next to its value. */
  typeLabel?: string;
}

/** The props every observable flyout panel gets. */
export type ObservableFlyoutPanelProps = OpenObservableFlyoutParams & { onClose: () => void };

export interface ObservableFlyoutApi {
  /** Opens the observable flyout: its details, and how many other cases hold it. */
  openObservableFlyout: (params: OpenObservableFlyoutParams) => void;
  /** Opens the tool listing the other cases holding the observable, with Back to the observable. */
  openObservableCases: (params: OpenObservableFlyoutParams) => void;
}

/**
 * The open methods of the observable flyout, following the Security flyout v2 conventions: a main
 * panel and tool panels, lazy-loaded, each a new session in one history group.
 */
export const useObservableFlyoutApi = (): ObservableFlyoutApi => {
  const context = useObservableFlyoutContext();
  const {
    services: { overlays },
  } = context;
  const { getCaseViewUrl } = useCaseViewNavigation();
  const { showSuccessToast } = useCasesToast();

  // A link to the case's observables with this observable's flyout open, the share link of the
  // Security flyout v2 headers. It sits in the menu bar, next to the close button.
  const getLinkAction = useCallback(
    ({ observable, caseData }: OpenObservableFlyoutParams) => {
      const linkParams = new URLSearchParams({
        [OBSERVABLE_LINK_PARAMS.typeKey]: observable.typeKey,
        [OBSERVABLE_LINK_PARAMS.value]: observable.value,
      });
      const caseUrl = getCaseViewUrl(
        { detailName: caseData.id, tabId: CASE_VIEW_PAGE_TABS.OBSERVABLES },
        true
      );
      const url = `${caseUrl}&${linkParams.toString()}`;
      return {
        iconType: 'link',
        'aria-label': COPY_LINK,
        toolTipContent: COPY_LINK,
        onClick: () => {
          if (copyToClipboard(url)) {
            showSuccessToast(LINK_COPIED);
          }
        },
        'data-test-subj': 'cases-observable-flyout-copy-link',
      };
    },
    [getCaseViewUrl, showSuccessToast]
  );

  const open = useCallback(
    (
      Panel: ComponentType<ObservableFlyoutPanelProps>,
      properties: ObservableFlyoutProperties,
      title: string,
      params: OpenObservableFlyoutParams,
      trailingActions?: EuiFlyoutMenuProps['trailingActions']
    ) => {
      const flyoutMenuProps: EuiFlyoutMenuProps = { title, trailingActions };
      overlays.openFlyoutTemplate({ ...properties, flyoutMenuProps }, ({ onClose }) => (
        <ObservableFlyoutProviders context={context}>
          {/* No fallback: a placeholder template would unmount when the panel loads, and
                unmounting a managed flyout closes its whole history group. */}
          <Suspense fallback={null}>
            <Panel {...params} onClose={onClose} />
          </Suspense>
        </ObservableFlyoutProviders>
      ));
    },
    [context, overlays]
  );

  const openObservableFlyout = useCallback(
    (params: OpenObservableFlyoutParams) =>
      open(
        ObservableFlyout,
        OBSERVABLE_FLYOUT_PROPERTIES,
        formatFlyoutTitle(OBSERVABLE_TITLE, params.observable.value),
        params,
        [getLinkAction(params)]
      ),
    [getLinkAction, open]
  );

  const openObservableCases = useCallback(
    (params: OpenObservableFlyoutParams) =>
      open(
        ObservableCasesTool,
        OBSERVABLE_TOOL_FLYOUT_PROPERTIES,
        formatFlyoutTitle(OBSERVABLE_CASES_TITLE, params.observable.value),
        params
      ),
    [open]
  );

  return useMemo(
    () => ({ openObservableFlyout, openObservableCases }),
    [openObservableCases, openObservableFlyout]
  );
};
