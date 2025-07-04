/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';

export interface PageIntroductionProps {
  actions?: React.ReactNode | React.ReactNode[];
  description: React.ReactNode | string;
  links?: React.ReactNode | React.ReactNode[];
  title?: string | React.ReactNode;
}

export const PageIntroduction: React.FC<PageIntroductionProps> = ({
  actions,
  description,
  links,
  title = '',
}) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem data-test-subj="pageIntroductionTitleContainer">
            {typeof title === 'string' ? (
              <EuiTitle size="xs" data-test-subj="inlineEditableTableTitle">
                <h3>{title}</h3>
              </EuiTitle>
            ) : (
              title
            )}
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <EuiText data-test-subj="pageIntroductionDescriptionText" color="subdued" size="s">
              {description}
            </EuiText>
          </EuiFlexItem>
          {!!links && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexItem>
                <EuiText size="s">
                  {Array.isArray(links)
                    ? links.map((link: any, index) =>
                        link ? React.cloneElement(link, { key: link.key || index }) : null
                      )
                    : links}
                </EuiText>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          {Array.isArray(actions)
            ? actions?.map((action, index) => (
                <EuiFlexItem grow={false} key={index}>
                  {action}
                </EuiFlexItem>
              ))
            : actions}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
