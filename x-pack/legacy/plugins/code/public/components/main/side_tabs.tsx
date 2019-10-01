/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiSpacer, EuiTabbedContent, EuiText } from '@elastic/eui';
import { parse as parseQuery } from 'querystring';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { MainRouteParams } from '../../common/types';
import { replaceParamInUrl } from '../../utils/query_string';
import { FileTree } from '../file_tree/file_tree';
import { Shortcut } from '../shortcuts';
import { SymbolTree } from '../symbol_tree/symbol_tree';
import { FileTree as IFileTree, FileTreeItemType } from '../../../model';

enum Tabs {
  file = 'file',
  structure = 'structure',
}

interface Props extends RouteComponentProps<MainRouteParams> {
  loadingFileTree: boolean;
  loadingStructureTree: boolean;
  hasStructure: boolean;
  languageServerInitializing: boolean;
  currentTree: IFileTree | null;
}

class CodeSideTabs extends React.PureComponent<Props> {
  public get sideTab(): Tabs {
    const { search } = this.props.location;
    let qs = search;
    if (search.charAt(0) === '?') {
      qs = search.substr(1);
    }
    const tab = parseQuery(qs).sideTab;
    return tab === Tabs.structure ? Tabs.structure : Tabs.file;
  }

  public renderLoadingSpinner(text: string) {
    return (
      <div>
        <EuiSpacer size="xl" />
        <EuiSpacer size="xl" />
        <EuiText textAlign="center">{text}</EuiText>
        <EuiSpacer size="m" />
        <EuiText textAlign="center">
          <EuiLoadingSpinner size="xl" />
        </EuiText>
      </div>
    );
  }

  public get tabs() {
    const { languageServerInitializing, loadingFileTree, loadingStructureTree } = this.props;
    const fileTabContent = loadingFileTree ? (
      this.renderLoadingSpinner(
        i18n.translate('xpack.code.mainPage.sideTab.loadingFileTreeText', {
          defaultMessage: 'Loading file tree',
        })
      )
    ) : (
      <div className="codeFileTree__container">{<FileTree />}</div>
    );
    let structureTabContent: React.ReactNode;
    if (languageServerInitializing) {
      structureTabContent = this.renderLoadingSpinner(
        i18n.translate('xpack.code.mainPage.sideTab.languageServerInitializingText', {
          defaultMessage: 'Language server is initializing',
        })
      );
    } else if (loadingStructureTree) {
      structureTabContent = this.renderLoadingSpinner(
        i18n.translate('xpack.code.mainPage.sideTab.loadingStructureTreeText', {
          defaultMessage: 'Loading structure tree',
        })
      );
    } else {
      const { resource, org, repo, revision, path } = this.props.match.params;
      const uri = `git://${resource}/${org}/${repo}/blob/${revision}/${path}`;
      structureTabContent = <SymbolTree uri={uri} />;
    }
    return [
      {
        id: Tabs.file,
        name: i18n.translate('xpack.code.mainPage.sideTab.fileTabLabel', {
          defaultMessage: 'Files',
        }),
        content: fileTabContent,
        'data-test-subj': `codeFileTreeTab${this.sideTab === Tabs.file ? 'Active' : ''}`,
      },
      {
        id: Tabs.structure,
        name: i18n.translate('xpack.code.mainPage.sideTab.structureTabLabel', {
          defaultMessage: 'Structure',
        }),
        content: structureTabContent,
        disabled:
          !(this.props.currentTree && this.props.currentTree.type === FileTreeItemType.File) ||
          !this.props.hasStructure,
        'data-test-subj': 'codeStructureTreeTab',
      },
    ];
  }

  public switchTab = (tab: Tabs) => {
    const { history } = this.props;
    const { pathname, search } = history.location;
    history.push(replaceParamInUrl(`${pathname}${search}`, 'sideTab', tab));
  };

  public render() {
    const tabs = this.tabs;
    const selectedTab = tabs.find(t => t.id === this.sideTab);
    return (
      <div>
        <EuiTabbedContent
          className="code-navigation__sidebar"
          tabs={tabs}
          onTabClick={tab => this.switchTab(tab.id as Tabs)}
          expand={true}
          selectedTab={selectedTab}
        />
        <Shortcut
          keyCode="t"
          help="Toggle tree and symbol view in sidebar"
          onPress={this.toggleTab}
        />
      </div>
    );
  }
  private toggleTab = () => {
    const currentTab = this.sideTab;
    if (currentTab === Tabs.file) {
      this.switchTab(Tabs.structure);
    } else {
      this.switchTab(Tabs.file);
    }
  };
}

export const SideTabs = withRouter(CodeSideTabs);
