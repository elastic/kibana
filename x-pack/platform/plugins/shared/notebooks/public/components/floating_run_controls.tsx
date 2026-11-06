/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, type RefObject } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { InputCellDefinition } from '../../common/types';
import { findPinnedTimeCell } from '../model/cell_factory';
import { FloatingIconButton } from './cell_filter_controls';
import { useTimeRefresh } from './notebook_header';
import { useNotebook } from './notebook_context';

const RUN_ALL_LABEL = i18n.translate('xpack.notebook.floatingRun.runAll', {
  defaultMessage: 'Run all',
});
const REFRESH_LABEL = i18n.translate('xpack.notebook.floatingRun.refresh', {
  defaultMessage: 'Refresh',
});

/**
 * Whether `target` has scrolled above `anchor`, a sticky element that marks the top of the
 * visible page (below Kibana's sticky top bar).
 */
const useIsScrolledAbove = (
  target: RefObject<HTMLElement>,
  anchor: RefObject<HTMLElement>
): boolean => {
  const [isAbove, setIsAbove] = useState(false);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const targetElement = target.current;
      const anchorElement = anchor.current;
      if (!targetElement || !anchorElement) return;
      setIsAbove(
        targetElement.getBoundingClientRect().bottom < anchorElement.getBoundingClientRect().top
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [target, anchor]);
  return isAbove;
};

const FloatingRefreshButton = ({ cell }: { cell: InputCellDefinition }) => {
  const { scheduler } = useNotebook();
  const { hasDependents, tooltip } = useTimeRefresh(cell.id);
  return (
    <FloatingIconButton
      iconType="refresh"
      label={REFRESH_LABEL}
      tooltip={tooltip}
      isDisabled={!hasDependents}
      onClick={() => scheduler.refresh([cell.id])}
      isPrimary
      dataTestSubj="notebookFloatingRefresh"
    />
  );
};

/** Run all, and Refresh for the global time range, at the top right once the header's are scrolled away. */
export const FloatingRunControls = ({
  headerControls,
}: {
  headerControls: RefObject<HTMLElement>;
}) => {
  const { euiTheme } = useEuiTheme();
  const { store, scheduler } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const pinnedTime = findPinnedTimeCell(cells);
  const anchor = useRef<HTMLDivElement>(null);
  const isVisible = useIsScrolledAbove(headerControls, anchor);

  return (
    <div
      ref={anchor}
      css={css`
        position: sticky;
        top: calc(var(--kbn-application--sticky-headers-offset, 0px) + ${euiTheme.size.l});
        z-index: ${euiTheme.levels.header};
        height: 0;
      `}
    >
      {isVisible && (
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          responsive={false}
          css={css`
            position: absolute;
            right: ${euiTheme.size.l};
            top: 0;
          `}
          data-test-subj="notebookFloatingRunControls"
        >
          <EuiFlexItem grow={false}>
            <FloatingIconButton
              iconType="play"
              label={RUN_ALL_LABEL}
              onClick={() => scheduler.runAll()}
              isPrimary
              dataTestSubj="notebookFloatingRunAll"
            />
          </EuiFlexItem>
          {pinnedTime && (
            <EuiFlexItem grow={false}>
              <FloatingRefreshButton cell={pinnedTime} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </div>
  );
};
