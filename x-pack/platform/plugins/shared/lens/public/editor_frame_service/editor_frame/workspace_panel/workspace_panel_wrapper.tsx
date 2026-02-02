/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiButton, useEuiTheme } from '@elastic/eui';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ChartSizeSpec } from '@kbn/chart-expressions-common';
import type { ChartSizeUnit } from '@kbn/chart-expressions-common/types';
import type { Interpolation, Theme } from '@emotion/react';
import { css } from '@emotion/react';
import type { UserMessagesGetter } from '@kbn/lens-common';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../../utils';
import { MessageList } from './message_list';
import {
  useLensDispatch,
  useLensSelector,
  selectChangesApplied,
  applyChanges,
  selectAutoApplyEnabled,
} from '../../../state_management';
import { WorkspaceTitle } from './title';

export const AUTO_APPLY_DISABLED_STORAGE_KEY = 'autoApplyDisabled';

export interface WorkspacePanelWrapperProps {
  children: React.ReactNode | React.ReactNode[];
  isFullscreen: boolean;
  getUserMessages: UserMessagesGetter;
  displayOptions: ChartSizeSpec | undefined;
}

const unitToCSSUnit: Record<ChartSizeUnit, string> = {
  pixels: 'px',
  percentage: '%',
};

const getAspectRatioStyles = ({ x, y }: { x: number; y: number }) => {
  return {
    aspectRatio: `${x}/${y}`,
    ...(y > x
      ? {
          height: '100%',
          width: 'auto',
        }
      : {
          height: 'auto',
          width: '100%',
        }),
  };
};

export function WorkspacePanelWrapper({
  children,
  isFullscreen,
  getUserMessages,
  displayOptions,
}: WorkspacePanelWrapperProps) {
  const dispatchLens = useLensDispatch();

  const { euiTheme } = useEuiTheme();

  const changesApplied = useLensSelector(selectChangesApplied);
  const autoApplyEnabled = useLensSelector(selectAutoApplyEnabled);

  const userMessages = getUserMessages('toolbar');

  const aspectRatio = displayOptions?.aspectRatio;
  const maxDimensions = displayOptions?.maxDimensions;
  const minDimensions = displayOptions?.minDimensions;

  let visDimensionsCSS: Interpolation<Theme> = {};

  if (aspectRatio) {
    visDimensionsCSS = getAspectRatioStyles(aspectRatio ?? maxDimensions);
  }

  if (maxDimensions) {
    visDimensionsCSS.maxWidth = maxDimensions.x
      ? `${maxDimensions.x.value}${unitToCSSUnit[maxDimensions.x.unit]}`
      : '';
    visDimensionsCSS.maxHeight = maxDimensions.y
      ? `${maxDimensions.y.value}${unitToCSSUnit[maxDimensions.y.unit]}`
      : '';
  }

  if (minDimensions) {
    visDimensionsCSS.minWidth = minDimensions.x
      ? `${minDimensions.x.value}${unitToCSSUnit[minDimensions.x.unit]}`
      : '';
    visDimensionsCSS.minHeight = minDimensions.y
      ? `${minDimensions.y.value}${unitToCSSUnit[minDimensions.y.unit]}`
      : '';
  }

  return (
    <EuiPageTemplate
      direction="column"
      offset={0}
      minHeight={0}
      restrictWidth={false}
      mainProps={{ component: 'div' } as unknown as {}}
    >
      {!(isFullscreen && (autoApplyEnabled || userMessages?.length)) && (
        <EuiPageTemplate.Section
          paddingSize="none"
          color="transparent"
          className="hide-for-sharing"
        >
          <EuiFlexGroup
            alignItems="flexEnd"
            gutterSize="s"
            direction="row"
            css={css`
              margin-bottom: ${euiTheme.size.m};
              ${isFullscreen &&
              `
                background-color: ${euiTheme.colors.emptyShade};
                justify-content: flex-end;
                margin-bottom: 0;
                padding: ${euiTheme.size.s} ${euiTheme.size.s} 0;
              `}
            `}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                {userMessages?.length ? (
                  <EuiFlexItem grow={false}>
                    <MessageList messages={userMessages} />
                  </EuiFlexItem>
                ) : null}

                {!autoApplyEnabled && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      disabled={autoApplyEnabled || changesApplied}
                      fill
                      className={
                        'lnsWorkspacePanelWrapper__applyButton ' +
                        DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS
                      }
                      iconType="checkInCircleFilled"
                      onClick={() => dispatchLens(applyChanges())}
                      size="m"
                      data-test-subj="lnsApplyChanges__toolbar"
                      minWidth="auto"
                    >
                      <FormattedMessage
                        id="xpack.lens.editorFrame.applyChangesLabel"
                        defaultMessage="Apply changes"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      )}

      <EuiPageTemplate.Section
        grow={true}
        paddingSize="none"
        contentProps={{
          className: 'lnsWorkspacePanelWrapper__content',
        }}
        className={classNames('lnsWorkspacePanelWrapper stretch-for-sharing')}
        css={css`
          height: 100%;
          margin-bottom: ${euiTheme.size.base};
          display: flex;
          flex-direction: column;
          position: relative; // For positioning the dnd overlay
          min-height: 400px;
          overflow: visible;
          height: 100%;

          .lnsWorkspacePanelWrapper__content {
            width: 100%;
            height: 100%;
            position: absolute;
          }
          ${isFullscreen &&
          `
            margin-bottom: 0;
            .lnsWorkspacePanelWrapper__content {
              padding: ${euiTheme.size.s}
            }
          `}
        `}
        color="transparent"
      >
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="center"
          direction="column"
          className="lnsWorkspacePanelWrapper__contentFlexGroup"
          css={css`
            height: 100%;
          `}
        >
          <EuiFlexItem
            data-test-subj="lnsWorkspacePanelWrapper__innerContent"
            grow={false}
            css={{
              flexGrow: 0,
              height: '100%',
              width: '100%',
              overflow: 'auto',
              ...visDimensionsCSS,
            }}
          >
            <WorkspaceTitle />
            {children}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
