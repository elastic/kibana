/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiAccordionProps } from '@elastic/eui';
import React, { useState, useCallback } from 'react';

type Props = Pick<EuiAccordionProps, Exclude<keyof EuiAccordionProps, 'initialIsOpen'>> & {
  forceExpand?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  renderExpandedContent: (expanded: boolean) => React.ReactNode;
};

/**
 * An accordion that doesn't render it's content unless it's expanded.
 * This component was created because `EuiAccordion`'s eager rendering of
 * accordion content was creating performance issues when used in repeating
 * content on the page.
 *
 * The current implementation actually renders the content *outside* of the
 * actual EuiAccordion when the accordion is expanded! It does this because
 * EuiAccordian applies a `translate` style to the content that causes
 * any draggable content (inside `EuiAccordian`) to have a `translate` style
 * that messes up rendering while the user drags it.
 *
 * TODO: animate the expansion and collapse of content rendered "below"
 * the real `EuiAccordion`.
 */
export const LazyAccordion = React.memo<Props>(
  ({
    buttonContent,
    buttonContentClassName,
    extraAction,
    forceExpand,
    id,
    onCollapse,
    onExpand,
    paddingSize,
    renderExpandedContent,
  }) => {
    const [expanded, setExpanded] = useState(false);
    const onCollapsedClick = useCallback(() => {
      setExpanded(true);
      if (onExpand != null) {
        onExpand();
      }
    }, [onExpand]);

    const onExpandedClick = useCallback(() => {
      setExpanded(false);
      if (onCollapse != null) {
        onCollapse();
      }
    }, [onCollapse]);

    return (
      <>
        {forceExpand || expanded ? (
          <>
            <EuiAccordion
              buttonContent={buttonContent}
              buttonContentClassName={buttonContentClassName}
              data-test-subj="lazy-accordion-expanded"
              extraAction={extraAction}
              id={id}
              initialIsOpen={true}
              paddingSize={paddingSize}
              onClick={onExpandedClick}
            >
              <></>
            </EuiAccordion>
            {renderExpandedContent(expanded)}
          </>
        ) : (
          <EuiAccordion
            buttonContent={buttonContent}
            buttonContentClassName={buttonContentClassName}
            data-test-subj="lazy-accordion-placeholder"
            extraAction={extraAction}
            id={id}
            paddingSize={paddingSize}
            onClick={onCollapsedClick}
          />
        )}
      </>
    );
  }
);

LazyAccordion.displayName = 'LazyAccordion';
