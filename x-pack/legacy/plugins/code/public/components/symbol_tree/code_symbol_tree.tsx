/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiIcon, EuiSideNav, EuiText, EuiToken } from '@elastic/eui';
import { IconType } from '@elastic/eui';
import React from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import url from 'url';
import { Range, SymbolKind } from 'vscode-languageserver-types';
import { isEqual } from 'lodash';

import { RepositoryUtils } from '../../../common/repository_utils';
import { EuiSideNavItem, MainRouteParams } from '../../common/types';
import { SymbolWithMembers } from '../../actions/structure';

interface Props extends RouteComponentProps<MainRouteParams> {
  structureTree: SymbolWithMembers[];
  closedPaths: string[];
  openSymbolPath: (p: string) => void;
  closeSymbolPath: (p: string) => void;
  uri: string;
}

interface ActiveSymbol {
  name: string;
  range: Range;
}

export class CodeSymbolTree extends React.PureComponent<Props, { activeSymbol?: ActiveSymbol }> {
  public state: { activeSymbol?: ActiveSymbol } = {};

  public getClickHandler = (symbol: ActiveSymbol) => () => {
    this.setState({ activeSymbol: symbol });
  };

  public getStructureTreeItemRenderer = (
    range: Range,
    name: string,
    kind: SymbolKind,
    isContainer: boolean = false,
    forceOpen: boolean = false,
    path: string = ''
  ) => () => {
    let tokenType = 'tokenFile';

    // @ts-ignore
    tokenType = `token${Object.keys(SymbolKind).find(k => SymbolKind[k] === kind)}`;
    let bg = null;
    if (
      this.state.activeSymbol &&
      this.state.activeSymbol.name === name &&
      isEqual(this.state.activeSymbol.range, range)
    ) {
      bg = <div className="code-full-width-node" />;
    }
    const queries = url.parse(this.props.location.search, true).query;
    return (
      <div className="code-symbol-container">
        {bg}
        <Link
          data-test-subj={`codeStructureTreeNode-${name}`}
          to={url.format({
            pathname: RepositoryUtils.locationToUrl({ uri: this.props.uri, range }),
            query: { sideTab: 'structure', ...queries },
          })}
          className="code-symbol-link codeFileTree__node--link"
          onClick={this.getClickHandler({ name, range })}
        ></Link>
        <div className={isContainer ? 'codeSymbol' : 'codeSymbol codeSymbol--nested'}>
          {isContainer &&
            (forceOpen ? (
              <EuiIcon
                type="arrowDown"
                size="s"
                color="subdued"
                className="codeStructureTree--icon"
                onClick={() => this.props.closeSymbolPath(path)}
              />
            ) : (
              <EuiIcon
                type="arrowRight"
                size="s"
                color="subdued"
                className="codeStructureTree--icon"
                onClick={() => this.props.openSymbolPath(path)}
              />
            ))}
          <EuiFlexGroup gutterSize="none" alignItems="center" className="code-structure-node">
            <EuiToken iconType={tokenType as IconType} />
            <EuiText size="s">{name}</EuiText>
          </EuiFlexGroup>
        </div>
      </div>
    );
  };

  public symbolsToSideNavItems = (symbolsWithMembers: SymbolWithMembers[]): EuiSideNavItem[] => {
    return symbolsWithMembers.map((s: SymbolWithMembers, index: number) => {
      const item: EuiSideNavItem = {
        name: s.name,
        id: `${s.name}_${index}`,
        onClick: () => void 0,
      };
      if (s.members) {
        item.forceOpen = !this.props.closedPaths.includes(s.path!);
        if (item.forceOpen) {
          item.items = this.symbolsToSideNavItems(s.members);
        }
        item.renderItem = this.getStructureTreeItemRenderer(
          s.range,
          s.name,
          s.kind,
          s.members.length > 0,
          item.forceOpen,
          s.path
        );
      } else {
        item.renderItem = this.getStructureTreeItemRenderer(
          s.range,
          s.name,
          s.kind,
          false,
          false,
          s.path
        );
      }
      return item;
    });
  };

  public render() {
    const items = [
      { name: '', id: '', items: this.symbolsToSideNavItems(this.props.structureTree) },
    ];
    return (
      <div className="codeContainer__sideTabTree">
        <EuiSideNav items={items} />
      </div>
    );
  }
}
