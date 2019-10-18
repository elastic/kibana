/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ReactNode } from 'react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiText,
  EuiTabs,
  EuiTab,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { CodeViewer } from './code_viewer';
import { History } from './history';
import { absoluteCodeFileURI } from './helpers';

enum Tab {
  code,
  history,
  blame,
}

export const CodeFlyoutMain = (props: { repo: string; file: string; revision: string }) => {
  const [selectedTab, setSelectedTab] = React.useState<Tab>(Tab.code);

  let content: ReactNode;

  switch (selectedTab) {
    case Tab.blame:
      content = (
        <CodeViewer
          key="blame"
          repo={props.repo}
          file={props.file}
          revision={props.revision}
          showBlame={true}
        />
      );
      break;
    case Tab.history:
      content = <History revision={props.revision} repo={props.repo} file={props.file} />;
      break;
    case Tab.code:
      content = (
        <CodeViewer key="code" repo={props.repo} file={props.file} revision={props.revision} />
      );
      break;
  }

  return (
    <Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">File Preview</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <div className="codeFlyout__subHeader">
        <div className="codeFlyout__fileHeader">
          <EuiIcon className="codeFlyout__icon" type="codeApp" size="m" />
          <EuiText size="s">
            <EuiLink
              className="codeFlyout__fileLink"
              href={absoluteCodeFileURI(props.repo, props.file, props.revision)}
            >
              {props.file}
            </EuiLink>
          </EuiText>
        </div>
        <EuiTabs className="codeFlyout__tabs">
          <EuiTab onClick={() => setSelectedTab(Tab.code)} isSelected={selectedTab === Tab.code}>
            Code
          </EuiTab>
          <EuiTab
            onClick={() => setSelectedTab(Tab.history)}
            isSelected={selectedTab === Tab.history}
          >
            History
          </EuiTab>
          <EuiTab onClick={() => setSelectedTab(Tab.blame)} isSelected={selectedTab === Tab.blame}>
            Blame
          </EuiTab>
        </EuiTabs>
      </div>
      <div className="codeFlyout__content">{content}</div>
    </Fragment>
  );
};
