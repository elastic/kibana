/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext } from 'react';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch, EuiToolTip, useEuiTheme } from '@elastic/eui';

import { mainTranslations } from './main_i18n';

/**
 * Prototype-only state backing the breadcrumbs switch. While off, the wizard is
 * pinned to Flow 3 9.6; turning it on re-exposes the frozen flow variants so
 * they can still be compared side by side.
 *
 * Kibana renders breadcrumb extensions in its own React tree, so the switch
 * cannot read this through context. The store is shared by instance instead.
 */
export type FlowPreviewModeStore = BehaviorSubject<boolean>;

export const createFlowPreviewModeStore = (): FlowPreviewModeStore =>
  new BehaviorSubject<boolean>(false);

/** Used when no provider is present, e.g. in tests rendering a subtree. */
const disabledStore: FlowPreviewModeStore = new BehaviorSubject<boolean>(false);

const FlowPreviewModeContext = createContext<FlowPreviewModeStore>(disabledStore);

export const FlowPreviewModeProvider: FunctionComponent<
  PropsWithChildren<{ store: FlowPreviewModeStore }>
> = ({ store, children }) => (
  <FlowPreviewModeContext.Provider value={store}>{children}</FlowPreviewModeContext.Provider>
);

const useFlowPreviewValue = (store: FlowPreviewModeStore): boolean =>
  useObservable(store, store.getValue());

export const useIsFlowPreviewEnabled = (): boolean =>
  useFlowPreviewValue(useContext(FlowPreviewModeContext));

export interface FlowPreviewModeSwitchProps {
  store: FlowPreviewModeStore;
}

export const FlowPreviewModeSwitch: FunctionComponent<FlowPreviewModeSwitchProps> = ({ store }) => {
  const { euiTheme } = useEuiTheme();
  const isEnabled = useFlowPreviewValue(store);

  const onChange = useCallback(
    (event: EuiSwitchEvent) => {
      store.next(event.target.checked);
    },
    [store]
  );

  return (
    <EuiToolTip content={mainTranslations.flowPreview.switchLabel}>
      <EuiSwitch
        compressed
        showLabel={false}
        label={mainTranslations.flowPreview.switchLabel}
        checked={isEnabled}
        onChange={onChange}
        css={css`
          margin-inline-start: ${euiTheme.size.m};
        `}
        data-test-subj="dataFederationFlowPreviewSwitch"
      />
    </EuiToolTip>
  );
};
