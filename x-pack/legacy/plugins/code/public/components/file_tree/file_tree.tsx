/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiIcon, EuiSideNav, EuiText } from '@elastic/eui';
import classes from 'classnames';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { FileTree as Tree, FileTreeItemType } from '../../../model';
import { EuiSideNavItem, MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';
import { encodeRevisionString } from '../../../common/uri_util';
import { trackCodeUiMetric, METRIC_TYPE } from '../../services/ui_metric';
import { CodeUIUsageMetrics } from '../../../model/usage_telemetry_metrics';

interface Props extends RouteComponentProps<MainRouteParams> {
  node?: Tree;
  isNotFound: boolean;
}

interface State {
  closedPaths: string[];
  openPaths: string[];
}

export class CodeFileTree extends React.Component<Props, State> {
  static getDerivedStateFromProps(props: Props, state: State) {
    return { openPaths: CodeFileTree.getOpenPaths(props.match.params.path || '', state.openPaths) };
  }

  constructor(props: Props) {
    super(props);
    const { path } = props.match.params;
    if (path) {
      this.state = {
        openPaths: CodeFileTree.getOpenPaths(path, []),
        closedPaths: [],
      };
    } else {
      this.state = {
        openPaths: [],
        closedPaths: [],
      };
    }
  }

  static getOpenPaths = (path: string, openPaths: string[]) => {
    let p = path;
    const newOpenPaths = [...openPaths];
    const pathSegs = p.split('/');
    while (!openPaths.includes(p)) {
      newOpenPaths.push(p);
      pathSegs.pop();
      if (pathSegs.length <= 0) {
        break;
      }
      p = pathSegs.join('/');
    }
    return newOpenPaths;
  };

  openTreePath = (path: string) => {
    const newClosedPaths = this.state.closedPaths.filter(p => !(p === path));
    this.setState({
      openPaths: CodeFileTree.getOpenPaths(path, this.state.openPaths),
      closedPaths: newClosedPaths,
    });
  };

  closeTreePath = (path: string) => {
    const isSubFolder = (p: string) => p.startsWith(path + '/');
    const newOpenPaths = this.state.openPaths.filter(p => !(p === path || isSubFolder(p)));
    const newClosedPaths = [...this.state.closedPaths, path];
    this.setState({ openPaths: newOpenPaths, closedPaths: newClosedPaths });
  };

  public onClick = (node: Tree) => {
    const { resource, org, repo, revision, path } = this.props.match.params;
    if (!(path === node.path)) {
      let pathType: PathTypes;
      if (node.type === FileTreeItemType.Link || node.type === FileTreeItemType.File) {
        pathType = PathTypes.blob;
      } else {
        pathType = PathTypes.tree;
      }
      this.props.history.push(
        `/${resource}/${org}/${repo}/${pathType}/${encodeRevisionString(revision)}/${node.path}`
      );
    }
  };

  public toggleTree = (path: string) => {
    if (this.isPathOpen(path)) {
      this.closeTreePath(path);
    } else {
      this.openTreePath(path);
    }
  };

  public flattenDirectory: (node: Tree) => Tree[] = (node: Tree) => {
    if (node.childrenCount === 1 && node.children![0].type === FileTreeItemType.Directory) {
      if (node.children![0].path === this.props.match.params.path) {
        return [node, node.children![0]];
      } else {
        return [node, ...this.flattenDirectory(node.children![0])];
      }
    } else {
      return [node];
    }
  };

  public scrollIntoView(el: any) {
    if (el) {
      const rect = el.getBoundingClientRect();
      const elemTop = rect.top;
      const elemBottom = rect.bottom;
      const isVisible = elemTop >= 0 && elemBottom <= window.innerHeight;
      if (!isVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }

  public getItemRenderer = (node: Tree, forceOpen: boolean, flattenFrom?: Tree) => () => {
    const className = 'codeFileTree__item kbn-resetFocusState';
    const onClick = () => {
      const path = flattenFrom ? flattenFrom.path! : node.path!;
      this.toggleTree(path);
      this.onClick(node);
      // track file tree click count
      trackCodeUiMetric(METRIC_TYPE.COUNT, CodeUIUsageMetrics.FILE_TREE_CLICK_COUNT);
    };
    const nodeTypeMap = {
      [FileTreeItemType.Directory]: 'Directory',
      [FileTreeItemType.File]: 'File',
      [FileTreeItemType.Link]: 'Link',
      [FileTreeItemType.Submodule]: 'Submodule',
    };
    let bg = (
      <div
        tabIndex={0}
        className="codeFileTree__node--link"
        data-test-subj={`codeFileTreeNode-${nodeTypeMap[node.type]}-${node.path}`}
        onClick={onClick}
        onKeyDown={onClick}
        role="button"
      />
    );
    if (this.props.match.params.path === node.path) {
      bg = (
        <div
          ref={el => this.scrollIntoView(el)}
          className="codeFileTree__node--fullWidth"
          tabIndex={0}
          data-test-subj={`codeFileTreeNode-${nodeTypeMap[node.type]}-${node.path}`}
          onClick={onClick}
          onKeyDown={onClick}
          role="button"
        />
      );
    }
    switch (node.type) {
      case FileTreeItemType.Directory: {
        return (
          <div className="codeFileTree__node">
            <div
              className={className}
              role="button"
              tabIndex={0}
              onKeyDown={onClick}
              onClick={onClick}
            >
              {forceOpen ? (
                <EuiIcon type="arrowDown" size="s" className="codeFileTree__icon" />
              ) : (
                <EuiIcon type="arrowRight" size="s" className="codeFileTree__icon" />
              )}
              <EuiIcon
                type={forceOpen ? 'folderOpen' : 'folderClosed'}
                data-test-subj={`codeFileTreeNode-Directory-Icon-${node.path}-${
                  forceOpen ? 'open' : 'closed'
                }`}
              />
              <span className="codeFileTree__directory">
                <EuiText size="xs" grow={false} className="eui-displayInlineBlock">
                  {node.name}
                </EuiText>
              </span>
            </div>
            {bg}
          </div>
        );
      }
      case FileTreeItemType.Submodule: {
        return (
          <div className="codeFileTree__node">
            <div
              tabIndex={0}
              onKeyDown={onClick}
              onClick={onClick}
              className={classes(className, 'codeFileTree__file')}
              role="button"
            >
              <EuiIcon type="submodule" />
              <span className="codeFileTree__directory">
                <EuiText size="xs" grow={false} color="default" className="eui-displayInlineBlock">
                  {node.name}
                </EuiText>
              </span>
            </div>
            {bg}
          </div>
        );
      }
      case FileTreeItemType.Link: {
        return (
          <div className="codeFileTree__node">
            <div
              tabIndex={0}
              onKeyDown={onClick}
              onClick={onClick}
              className={classes(className, 'codeFileTree__file')}
              role="button"
            >
              <EuiIcon type="symlink" />
              <span className="codeFileTree__directory">
                <EuiText size="xs" grow={false} color="default" className="eui-displayInlineBlock">
                  {node.name}
                </EuiText>
              </span>
            </div>
            {bg}
          </div>
        );
      }
      case FileTreeItemType.File: {
        return (
          <div className="codeFileTree__node">
            <div
              tabIndex={0}
              onKeyDown={onClick}
              onClick={onClick}
              className={classes(className, 'codeFileTree__file')}
              role="button"
            >
              <EuiIcon type="document" />
              <span className="codeFileTree__directory">
                <EuiText size="xs" grow={false} color="default" className="eui-displayInlineBlock">
                  {node.name}
                </EuiText>
              </span>
            </div>
            {bg}
          </div>
        );
      }
    }
  };

  public treeToItems = (node: Tree): EuiSideNavItem => {
    const forceOpen =
      node.type === FileTreeItemType.Directory ? this.isPathOpen(node.path!) : false;
    const data: EuiSideNavItem = {
      id: node.name,
      name: node.name,
      isSelected: false,
      renderItem: this.getItemRenderer(node, forceOpen),
      forceOpen,
      onClick: () => void 0,
    };
    if (node.type === FileTreeItemType.Directory && Number(node.childrenCount) > 0) {
      const nodes = this.flattenDirectory(node);
      const length = nodes.length;
      if (length > 1 && !(this.props.match.params.path === node.path)) {
        data.name = nodes.map(n => n.name).join('/');
        data.id = data.name;
        const lastNode = nodes[length - 1];
        const flattenNode = {
          ...lastNode,
          name: data.name,
          id: data.id,
        };
        data.forceOpen = this.isPathOpen(node.path!);
        data.renderItem = this.getItemRenderer(flattenNode, data.forceOpen, node);
        if (data.forceOpen && Number(flattenNode.childrenCount) > 0) {
          data.items = flattenNode.children!.map(this.treeToItems);
        }
      } else if (forceOpen && node.children) {
        data.items = node.children.map(this.treeToItems);
      }
    }
    return data;
  };

  public render() {
    const items = [
      {
        name: '',
        id: '',
        items: (this.props.node!.children || []).map(this.treeToItems),
      },
    ];
    return (
      this.props.node && (
        <EuiSideNav items={items} isOpenOnMobile={true} className="codeContainer__sideTabTree" />
      )
    );
  }

  private isPathOpen(path: string) {
    if (this.props.isNotFound) return false;
    return this.state.openPaths.includes(path) && !this.state.closedPaths.includes(path);
  }
}

const mapStateToProps = (state: RootState) => ({
  node: state.fileTree.tree,
  isNotFound: state.file.isNotFound,
});

export const FileTree = withRouter(connect(mapStateToProps)(CodeFileTree));
