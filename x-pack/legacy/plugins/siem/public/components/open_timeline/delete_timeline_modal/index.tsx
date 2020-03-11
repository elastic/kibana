/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiModal, EuiOverlayMask, EuiIcon, EuiLinkAnchorProps } from '@elastic/eui';
import React, { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

import classNames from 'classnames';
import { DeleteTimelineModal, DELETE_TIMELINE_MODAL_WIDTH } from './delete_timeline_modal';
import * as i18n from '../translations';
import { DeleteTimelines } from '../types';

const RemovePopover = createGlobalStyle`
div.euiPopover__panel-isOpen {
  display: none;
}
`;

type CustomLinkType = EuiLinkAnchorProps & { disabled: boolean };

export const CustomLink = React.forwardRef<HTMLAnchorElement, CustomLinkType>(
  (
    {
      children,
      color = 'primary',
      className,
      href,
      external,
      target,
      rel,
      type = 'button',
      onClick,
      disabled,
      ...rest
    },
    ref
  ) => {
    const anchorProps = {
      className: classNames('euiLink', disabled ? 'euiLink-disabled' : 'euiLink--text', className),
      href,
      target,
      onClick,
      ...rest,
    };

    return !disabled ? (
      <a ref={ref as React.Ref<HTMLAnchorElement>} {...anchorProps}>
        {children}
      </a>
    ) : (
      <span>{children}</span>
    );
  }
);

CustomLink.displayName = 'CustomLink';

export const TimelineCustomAction = styled(CustomLink)`
  width: 100%;
  .euiButtonEmpty__content a {
    justify-content: flex-start;
  }
`;

export const ActionListIcon = styled(EuiIcon)`
  margin-right: 8px;
`;

interface Props {
  deleteTimelines?: DeleteTimelines;
  savedObjectIds?: string[] | null | undefined;
  title?: string | JSX.Element | null;
  onComplete?: () => void;
}
/**
 * Renders a button that when clicked, displays the `Delete Timeline` modal
 */
export const DeleteTimelineModalButton = React.memo<Props>(
  ({ deleteTimelines, savedObjectIds, title, onComplete }) => {
    const [showModal, setShowModal] = useState(false);

    const openModal = () => setShowModal(true);
    const closeModal = () => {
      setShowModal(false);
      if (typeof onComplete === 'function') onComplete();
    };

    const onDelete = () => {
      if (deleteTimelines != null && savedObjectIds != null) {
        deleteTimelines(savedObjectIds);
      }
      closeModal();
      if (typeof onComplete === 'function') onComplete();
    };

    return (
      <>
        {showModal && <RemovePopover />}
        <TimelineCustomAction
          aria-label={i18n.DELETE_SELECTED}
          color="text"
          data-test-subj="delete-timeline-wrapper"
          disabled={
            deleteTimelines == null ||
            savedObjectIds == null ||
            savedObjectIds.filter(id => id != null && id.length > 0).length === 0
          }
          onClick={openModal}
        >
          <>
            <ActionListIcon size="m" type="trash" data-test-subj="delete-timeline" />
            {i18n.DELETE_SELECTED}
          </>
        </TimelineCustomAction>
        {showModal ? (
          <EuiOverlayMask>
            <EuiModal maxWidth={DELETE_TIMELINE_MODAL_WIDTH} onClose={closeModal}>
              <DeleteTimelineModal
                data-test-subj="delete-timeline-modal"
                onDelete={onDelete}
                title={title}
                closeModal={closeModal}
              />
            </EuiModal>
          </EuiOverlayMask>
        ) : null}
      </>
    );
  }
);

DeleteTimelineModalButton.displayName = 'DeleteTimelineModalButton';
