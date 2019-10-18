/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiLoadingKibana,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import classname from 'classnames';
import queryString from 'querystring';
import React from 'react';
import { parseSchema } from '../../../common/uri_util';
import { GroupedFileResults, GroupedRepoResults } from '../../actions';
import { history } from '../../utils/url';
import { CodeBlockPanel, Position } from '../code_block';

interface Props {
  isLoading: boolean;
  title: string;
  references: GroupedRepoResults[];
  refUrl?: string;
  onClose(): void;
}
interface State {
  expanded: boolean;
}

export class ReferencesPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  public close = () => {
    this.props.onClose();
  };

  public toggleExpand = () => {
    this.setState({ expanded: !this.state.expanded });
  };

  public render() {
    const body = this.props.isLoading ? <EuiLoadingKibana size="xl" /> : this.renderGroupByRepo();
    const styles: any = {};
    const expanded = this.state.expanded;
    return (
      <EuiPanel
        grow={false}
        className={classname(['code-editor-references-panel', expanded ? 'expanded' : ''])}
        style={styles}
      >
        <EuiButtonIcon
          size="s"
          onClick={this.toggleExpand}
          iconType={expanded ? 'arrowDown' : 'arrowUp'}
          aria-label="Next"
          className="expandButton"
        />
        {!expanded && (
          <EuiButtonIcon
            className="euiFlyout__closeButton"
            size="s"
            onClick={this.close}
            iconType="cross"
            aria-label="Next"
          />
        )}
        <EuiTitle size="s">
          <h3>{this.props.title}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <div className="code-auto-overflow-y">{body}</div>
      </EuiPanel>
    );
  }

  private renderGroupByRepo() {
    return this.props.references.map((ref: GroupedRepoResults) => {
      return this.renderReferenceRepo(ref);
    });
  }

  private renderReferenceRepo({ repo, files }: GroupedRepoResults) {
    const [org, name] = repo.split('/').slice(1);
    const buttonContent = (
      <span>
        <span>{org}</span>/<b>{name}</b>
      </span>
    );

    return (
      <EuiAccordion
        id={repo}
        key={repo}
        buttonContentClassName="code-editor-reference-accordion-button"
        buttonContent={buttonContent}
        paddingSize="s"
        initialIsOpen={true}
      >
        {files.map(file => this.renderReference(file))}
      </EuiAccordion>
    );
  }

  private renderReference(file: GroupedFileResults) {
    const key = `${file.uri}`;
    const header = (
      <React.Fragment>
        <EuiText size="s">
          <a href={`#${this.computeUrl(file.uri)}`}>{file.file}</a>
        </EuiText>
        <EuiSpacer size="s" />
      </React.Fragment>
    );

    return (
      <CodeBlockPanel
        className="referencesPanel__code-block"
        key={key}
        header={header}
        lines={file.code.split('\n')}
        language={file.language}
        lineNumber={i => file.lineNumbers[i]}
        highlightRanges={file.highlights}
        onClick={this.onCodeClick(file.uri)}
      />
    );
  }

  private onCodeClick = (url: string) => (position: Position) => {
    const lineNum = parseInt(position.lineNumber, 10);
    history.push(this.computeUrl(url, lineNum));
  };

  private computeUrl(url: string, line?: number) {
    const { uri } = parseSchema(url)!;
    let search = history.location.search;
    if (search.startsWith('?')) {
      search = search.substring(1);
    }
    const queries = queryString.parse(search);
    const query = queryString.stringify({
      ...queries,
      tab: 'references',
      refUrl: this.props.refUrl,
    });

    return line !== undefined ? `${uri}!L${line}:0?${query}` : `${uri}?${query}`;
  }
}
