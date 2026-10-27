/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';

import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

export interface SectionItem {
  title: string | JSX.Element;
  description: string | number | JSX.Element;
}

export interface SectionConfig {
  title: string;
  position: 'left' | 'right';
  items: SectionItem[];
}

interface SectionProps {
  section: SectionConfig;
}

export const Section: FC<SectionProps> = ({ section }) => {
  const { euiTheme } = useEuiTheme();

  if (section.items.length === 0) {
    return null;
  }

  return (
    <section>
      <EuiTitle size="xs">
        <span>{section.title}</span>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiDescriptionList
        compressed
        type="column"
        listItems={section.items}
        titleProps={{
          css: {
            fontSize: euiTheme.font.scale.xs * euiTheme.base,
          },
        }}
      />
    </section>
  );
};

interface ExpandedRowDetailsPaneProps {
  sections: SectionConfig[];
  showErrorCallout?: boolean;
  dataTestSubj?: string;
}

export const ExpandedRowColumnView: FC<ExpandedRowDetailsPaneProps> = ({
  sections,
  showErrorCallout = false,
  dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const columnStyles = {
    left: css`
      padding-inline-end: ${euiTheme.size.l};
    `,
    right: css`
      border-inline-start: ${euiTheme.border.thin};
      padding-inline-start: ${euiTheme.size.l};
    `,
  };
  const contentStyles = css`
    padding-block-start: ${euiTheme.size.s};
  `;

  return (
    <div data-test-subj={dataTestSubj ?? 'transformDetailsTabContent'}>
      {showErrorCallout && (
        <>
          <EuiSpacer size={'s'} />
          <KbnWarningCallout
            announceOnMount
            size="m"
            title={
              <FormattedMessage
                id="xpack.transform.list.extendedStatsError"
                defaultMessage="An error occurred fetching the extended stats for this transform. Basic stats are displayed instead."
              />
            }
          />
        </>
      )}
      <EuiFlexGroup gutterSize="none" responsive={false} css={contentStyles}>
        <EuiFlexItem css={columnStyles.left}>
          {sections
            .filter((s) => s.position === 'left')
            .map((s) => (
              <Fragment key={s.title}>
                <EuiSpacer size="s" />
                <Section section={s} />
              </Fragment>
            ))}
        </EuiFlexItem>
        <EuiFlexItem css={columnStyles.right}>
          {sections
            .filter((s) => s.position === 'right')
            .map((s) => (
              <Fragment key={s.title}>
                <EuiSpacer size="s" />
                <Section section={s} />
              </Fragment>
            ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
