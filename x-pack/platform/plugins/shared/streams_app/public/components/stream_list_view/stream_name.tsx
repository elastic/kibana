/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiLink,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useBoolean } from '@kbn/react-hooks/src/use_boolean';
import React, { useEffect } from 'react';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function StreamName({
  name,
  dataTestSubj,
  searchQuery,
  preview,
  forceHidePreview,
}: {
  name: string;
  searchQuery: string;
  dataTestSubj?: string;
  preview?: React.ReactNode;
  forceHidePreview?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();
  const [previewActionVisible, { off: hideAction, on: showAction }] = useBoolean(false);
  const [isPreviewOpen, { off: hidePreview, toggle: togglePreview }] = useBoolean(false);

  useEffect(() => {
    if (forceHidePreview) {
      hidePreview();
    }
  }, [forceHidePreview, hidePreview]);

  const handleHideAction = () => {
    if (!isPreviewOpen) {
      hideAction();
    }
  };

  const handleClosePreview = () => {
    hidePreview();
    hideAction();
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      onMouseEnter={showAction}
      onMouseLeave={handleHideAction}
      data-test-subj={dataTestSubj}
      alignItems="center"
    >
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj={`streamsNameLink-${name}`}
          href={router.link('/{key}', { path: { key: name } })}
        >
          <EuiHighlight search={searchQuery}>{name}</EuiHighlight>
        </EuiLink>
      </EuiFlexItem>
      {previewActionVisible && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonIcon
                iconType="inspect"
                aria-label="Inspect"
                color="primary"
                onClick={togglePreview}
              />
            }
            isOpen={isPreviewOpen}
            closePopover={handleClosePreview}
            focusTrapProps={{
              onEscapeKey: handleClosePreview,
            }}
          >
            <EuiButtonIcon
              iconType="cross"
              aria-label="Close"
              color="text"
              onClick={handleClosePreview}
              className={css`
                position: absolute;
                top: ${euiTheme.size.base};
                right: ${euiTheme.size.m};
              `}
            />
            {preview}
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
