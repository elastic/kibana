/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import { type UseEuiTheme } from '@elastic/eui';
import { openLazyFlyout } from '@kbn/presentation-util';
/**
 * Shared logic to mount the inline config panel
 * @param ConfigPanel
 * @param coreStart
 * @param overlayTracker
 * @param uuid
 * @param container
 */

export const mountInlinePanel = async ({
  core,
  api,
  loadContent,
  options: { dataTestSubj, uuid, container } = {},
}: {
  core: CoreStart;
  api?: unknown;
  loadContent: ({
    closeFlyout,
  }?: {
    closeFlyout: () => void;
  }) => Promise<JSX.Element | null | void>;
  uuid?: string;
  options?: {
    dataTestSubj?: string;
    uuid?: string;
    container?: HTMLElement | null;
  };
}) => {
  if (container) {
    const component = await loadContent();
    if (!component) {
      throw new Error('Inline panel content is not available');
    }
    return ReactDOM.render(component, container);
  }
  openLazyFlyout({
    core,
    parentApi: api,
    loadContent,
    flyoutProps: {
      ...lensFlyoutProps,
      'data-test-subj': dataTestSubj ?? 'customizeLens',
    },
    uuid,
  });
};

// styles needed to display extra drop targets that are outside of the config panel main area while also allowing to scroll vertically
const inlineFlyoutStyles = ({ euiTheme }: UseEuiTheme) => `
  clip-path: polygon(-100% 0, 100% 0, 100% 100%, -100% 100%);
  max-inline-size: 640px;
  min-inline-size: 256px;
  background:${euiTheme.colors.backgroundBaseSubdued};
  @include euiBreakpoint('xs', 's', 'm') {
    clip-path: none;
  }
  .kbnOverlayMountWrapper {
    padding-left: 400px;
    margin-left: -400px;
    pointer-events: none;
    .euiFlyoutFooter {
      pointer-events: auto;
    }
  }
`;

export const lensFlyoutProps: OverlayFlyoutOpenOptions & { triggerId?: string } = {
  css: inlineFlyoutStyles,
  'data-test-subj': 'customizeLens',
  hideCloseButton: true,
  isResizable: true,
  outsideClickCloses: true,
};
