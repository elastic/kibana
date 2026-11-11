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
      <EuiTitle size="xxs">
        <span>{section.title}</span>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiDescriptionList
        compressed
        type="column"
        columnWidths={[1, 2]}
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
  const leftSections = sections.filter(
    (section) => section.position === 'left' && section.items.length > 0
  );
  const rightSections = sections.filter(
    (section) => section.position === 'right' && section.items.length > 0
  );
  const hasTwoColumns = leftSections.length > 0 && rightSections.length > 0;
  const columnStyles = {
    left: css`
      padding-block: ${euiTheme.base}px;
      padding-inline-end: ${euiTheme.size.l};
    `,
    right: css`
      border-inline-start: ${euiTheme.border.thin};
      padding-block: ${euiTheme.base}px;
      padding-inline-start: ${euiTheme.size.l};
    `,
  };

  const renderSections = (columnSections: SectionConfig[]) =>
    columnSections.map((section, index) => (
      <Fragment key={section.title}>
        {index > 0 && <EuiSpacer size="s" />}
        <Section section={section} />
      </Fragment>
    ));

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
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem css={columnStyles.left} data-test-subj="transformExpandedRowColumn">
          {renderSections(leftSections.length > 0 ? leftSections : rightSections)}
        </EuiFlexItem>
        {hasTwoColumns && (
          <EuiFlexItem
            css={columnStyles.right}
            data-test-subj="transformExpandedRowColumnWithDivider"
          >
            {renderSections(rightSections)}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
