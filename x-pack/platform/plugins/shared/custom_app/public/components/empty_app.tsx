/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface EmptyAppProps {
  /** Without a way to change the app, it only says that it is empty. */
  canEdit: boolean;
  onBuild?: () => void;
  /** Absent when chat is not available, and then nothing offers it. */
  onDescribe?: () => void;
  onUseExample?: () => void;
}

interface Way {
  testSubj: string;
  icon: string;
  isAi?: boolean;
  title: string;
  description: string;
  onClick: () => void;
}

/** The widest it grows: three ways to begin side by side, and no wider than they need. */
const MAX_WIDTH = 820;
/** A way to begin is never narrower than this, and wraps under the others before it would be. */
const MIN_CARD_WIDTH = 200;

/** What an app with nothing in it shows: what it is for, and the ways to begin it. */
export const EmptyApp = ({ canEdit, onBuild, onDescribe, onUseExample }: EmptyAppProps) => {
  const ways: Way[] = [
    ...(onDescribe
      ? [
          {
            testSubj: 'customAppEmptyDescribe',
            icon: 'sparkles',
            isAi: true,
            title: i18n.translate('xpack.customApp.empty.describe', {
              defaultMessage: 'Describe it',
            }),
            description: i18n.translate('xpack.customApp.empty.describeDescription', {
              defaultMessage: 'Tell the assistant what you need and it builds the app.',
            }),
            onClick: onDescribe,
          },
        ]
      : []),
    ...(onBuild
      ? [
          {
            testSubj: 'customAppEmptyBuild',
            icon: 'pencil',
            title: i18n.translate('xpack.customApp.empty.build', {
              defaultMessage: 'Build it yourself',
            }),
            description: i18n.translate('xpack.customApp.empty.buildDescription', {
              defaultMessage: 'Add filters, charts and tables one by one in the editor.',
            }),
            onClick: onBuild,
          },
        ]
      : []),
    ...(onUseExample
      ? [
          {
            testSubj: 'customAppEmptyExample',
            icon: 'documents',
            title: i18n.translate('xpack.customApp.empty.example', {
              defaultMessage: 'Start from an example',
            }),
            description: i18n.translate('xpack.customApp.empty.exampleDescription', {
              defaultMessage: 'A small working app to change into your own.',
            }),
            onClick: onUseExample,
          },
        ]
      : []),
  ];

  return (
    <div
      data-test-subj="customAppEmpty"
      css={css({
        width: '100%',
        maxWidth: MAX_WIDTH,
        margin: '0 auto',
        padding: '24px 16px',
        textAlign: 'center',
      })}
    >
      <EuiFlexGroup justifyContent="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPanel
            color="primary"
            hasShadow={false}
            borderRadius="m"
            paddingSize="m"
            aria-hidden="true"
          >
            <EuiIcon type="apps" size="xxl" color="primary" aria-hidden="true" />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiTitle size="m">
        <h3>
          {canEdit
            ? i18n.translate('xpack.customApp.empty.title', { defaultMessage: 'Build your app' })
            : i18n.translate('xpack.customApp.empty.titleReadOnly', {
                defaultMessage: 'This app is empty',
              })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {canEdit
            ? i18n.translate('xpack.customApp.empty.body', {
                defaultMessage:
                  'Combine filters, charts, tables and details that work together, all driven by your data.',
              })
            : i18n.translate('xpack.customApp.empty.bodyReadOnly', {
                defaultMessage: 'Nothing has been added to it yet.',
              })}
        </p>
      </EuiText>
      {canEdit && ways.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="m" justifyContent="center" wrap responsive={false}>
            {ways.map(({ testSubj, icon, isAi, title, description, onClick }) => (
              <EuiFlexItem
                key={testSubj}
                grow
                css={css({ flexBasis: MIN_CARD_WIDTH, maxWidth: 260 })}
              >
                <EuiCard
                  hasBorder
                  // The same plain card for every way: a filled one reads as already chosen. The
                  // assistant stands out by its colour and its badge instead.
                  display="plain"
                  paddingSize="l"
                  icon={
                    <EuiPanel
                      color={isAi ? 'accent' : 'primary'}
                      hasShadow={false}
                      borderRadius="m"
                      paddingSize="s"
                      aria-hidden="true"
                    >
                      <EuiIcon
                        type={icon}
                        size="l"
                        color={isAi ? 'accent' : 'primary'}
                        aria-hidden="true"
                      />
                    </EuiPanel>
                  }
                  title={title}
                  titleSize="xs"
                  description={description}
                  onClick={onClick}
                  betaBadgeProps={
                    isAi
                      ? {
                          label: i18n.translate('xpack.customApp.empty.aiBadge', {
                            defaultMessage: 'AI',
                          }),
                          color: 'accent',
                        }
                      : undefined
                  }
                  data-test-subj={testSubj}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};
