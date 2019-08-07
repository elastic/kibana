/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonIcon, EuiPopover, EuiText } from '@elastic/eui';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import ErrorSvg from './error.svg';
import InfoSvg from './info.svg';
import AlertSvg from './alert.svg';
import BlankSvg from './blank.svg';
import {
  CTA,
  LangServerType,
  REPO_FILE_STATUS_SEVERITY,
  RepoFileStatus,
  RepoFileStatusText as StatusText,
  Severity,
  StatusReport,
} from '../../../common/repo_file_status';
import { RootState } from '../../reducers';
import { FetchFilePayload } from '../../actions';

interface Props {
  statusReport?: StatusReport;
  currentStatusPath?: FetchFilePayload;
  pathType: string;
}

interface State {
  isPopoverOpen: boolean;
}

const svgs = {
  [Severity.NOTICE]: InfoSvg,
  [Severity.WARNING]: AlertSvg,
  [Severity.ERROR]: ErrorSvg,
  [Severity.NONE]: BlankSvg,
};

export class StatusIndicatorComponent extends React.Component<Props, State> {
  constructor(props: Readonly<Props>) {
    super(props);
    this.state = {
      isPopoverOpen: false,
    };
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }
  openPopover() {
    this.setState({
      isPopoverOpen: true,
    });
  }

  render() {
    const { statusReport } = this.props;
    let severity = Severity.NONE;
    const children: any[] = [];
    const addError = (error: RepoFileStatus | LangServerType) => {
      // @ts-ignore
      const s: any = REPO_FILE_STATUS_SEVERITY[error];
      if (s) {
        if (s.severity > severity) {
          severity = s.severity;
        }
        const fix = s.fix;
        if (fix !== undefined) {
          const fixUrl = this.fixUrl(fix);
          children.push(
            <p key={`${error}_key`}>
              {error} You can {fixUrl}.
            </p>
          );
        } else {
          children.push(<p key={`${error}_key`}>{StatusText[error]}</p>);
        }
      }
    };
    if (statusReport) {
      if (statusReport.repoStatus) {
        addError(statusReport.repoStatus);
      }
      if (statusReport.fileStatus) {
        addError(statusReport.fileStatus);
      }
      if (statusReport.langServerType === LangServerType.GENERIC) {
        addError(statusReport.langServerType);
      }
      if (statusReport.langServerStatus) {
        addError(statusReport.langServerStatus);
      }
    }
    const svg = svgs[severity];
    const icon = (
      <EuiButtonIcon
        aria-label="status_indicator"
        iconType={svg}
        onClick={this.openPopover.bind(this)}
      />
    );
    if (children.length === 0) {
      return <div />;
    }

    return (
      <EuiPopover
        id="trapFocus"
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        ownFocus
        button={icon}
      >
        <EuiText size="xs">{children}</EuiText>
      </EuiPopover>
    );
  }

  private fixUrl(fix: CTA) {
    switch (fix) {
      case CTA.GOTO_LANG_MANAGE_PAGE:
        return <Link to="/admin?tab=LanguageServers">install it here</Link>;
      case CTA.SWITCH_TO_HEAD:
        const { uri, path } = this.props.currentStatusPath!;
        const headUrl = path
          ? `/${uri}/${this.props.pathType}/HEAD/${path}`
          : `/${uri}/${this.props.pathType}/HEAD/`;

        return <Link to={headUrl}>switch to HEAD</Link>;
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  statusReport: state.status.repoFileStatus,
  currentStatusPath: state.status.currentStatusPath,
  pathType: state.route.match.params.pathType,
});

export const StatusIndicator = connect(mapStateToProps)(StatusIndicatorComponent);
