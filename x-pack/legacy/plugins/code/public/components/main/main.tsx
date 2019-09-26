/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';

import { npStart } from 'ui/new_platform';
import { APP_TITLE } from '../../../common/constants';
import { MainRouteParams } from '../../common/types';
import { ShortcutsProvider } from '../shortcuts';
import { Content } from './content';
import { SideTabs } from './side_tabs';
import { structureSelector, currentTreeSelector } from '../../selectors';
import { RootState } from '../../reducers';
import { FileTree } from '../../../model';
import { trackCodeUiMetric, METRIC_TYPE } from '../../services/ui_metric';
import { CodeUIUsageMetrics } from '../../../model/usage_telemetry_metrics';

interface Props extends RouteComponentProps<MainRouteParams> {
  loadingFileTree: boolean;
  loadingStructureTree: boolean;
  hasStructure: boolean;
  languageServerInitializing: boolean;
  currentTree: FileTree | null;
}

class CodeMain extends React.Component<Props> {
  public componentDidMount() {
    this.setBreadcrumbs();
    // track source page load count
    trackCodeUiMetric(METRIC_TYPE.LOADED, CodeUIUsageMetrics.SOURCE_VIEW_PAGE_LOAD_COUNT);
  }

  public componentDidUpdate() {
    this.setBreadcrumbs();
  }

  public setBreadcrumbs() {
    const { resource, org, repo } = this.props.match.params;
    npStart.core.chrome.setBreadcrumbs([
      { text: APP_TITLE, href: '#/' },
      {
        text: `${org} → ${repo}`,
        href: `#/${resource}/${org}/${repo}`,
      },
    ]);
  }

  public componentWillUnmount() {
    npStart.core.chrome.setBreadcrumbs([{ text: APP_TITLE, href: '#/' }]);
  }

  public render() {
    const {
      loadingFileTree,
      loadingStructureTree,
      hasStructure,
      languageServerInitializing,
    } = this.props;
    return (
      <div className="codeContainer__root">
        <div className="codeContainer__rootInner">
          <React.Fragment>
            <SideTabs
              currentTree={this.props.currentTree}
              loadingFileTree={loadingFileTree}
              loadingStructureTree={loadingStructureTree}
              hasStructure={hasStructure}
              languageServerInitializing={languageServerInitializing}
            />
            <Content />
          </React.Fragment>
        </div>
        <ShortcutsProvider />
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  loadingFileTree: state.fileTree.fileTreeLoadingPaths.includes(''),
  loadingStructureTree: state.symbol.loading,
  hasStructure: structureSelector(state).length > 0 && !state.symbol.error,
  languageServerInitializing: state.symbol.languageServerInitializing,
  currentTree: currentTreeSelector(state),
});

export const Main = connect(mapStateToProps)(CodeMain);
