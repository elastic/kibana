/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { InstallationType } from '../../../common/installation';
import { LanguageServer, LanguageServerStatus } from '../../../common/language_server';
import { requestInstallLanguageServer } from '../../actions/language_server';
import { RootState } from '../../reducers';
import { JavaIcon, TypeScriptIcon, GoIcon } from '../shared/icons';

const LanguageServerLi = (props: {
  languageServer: LanguageServer;
  requestInstallLanguageServer: (l: string) => void;
  loading: boolean;
}) => {
  const { status, name } = props.languageServer;

  const languageIcon = () => {
    if (name === 'TypeScript') {
      return <TypeScriptIcon />;
    } else if (name === 'Java') {
      return <JavaIcon />;
    } else if (name === 'Go') {
      return <GoIcon />;
    }
  };

  const onInstallClick = () => props.requestInstallLanguageServer(name);
  let button = null;
  let state = null;
  if (status === LanguageServerStatus.RUNNING) {
    state = <EuiText size="xs">Running ...</EuiText>;
  } else if (status === LanguageServerStatus.NOT_INSTALLED) {
    state = (
      <EuiText size="xs" color={'subdued'}>
        Not Installed
      </EuiText>
    );
  } else if (status === LanguageServerStatus.READY) {
    state = (
      <EuiText size="xs" color={'subdued'}>
        Installed
      </EuiText>
    );
  }
  if (props.languageServer.installationType === InstallationType.Plugin) {
    button = (
      <EuiButton size="s" color="secondary" onClick={onInstallClick}>
        Setup
      </EuiButton>
    );
  }
  return (
    <EuiFlexItem>
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}> {languageIcon()} </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <strong>{name}</strong>
                </EuiText>
                <EuiText size="s">
                  <h6> {state} </h6>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}> {button} </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};

interface Props {
  languageServers: LanguageServer[];
  requestInstallLanguageServer: (ls: string) => void;
  installLoading: { [ls: string]: boolean };
}
interface State {
  showingInstruction: boolean;
  name?: string;
  url?: string;
  pluginName?: string;
}

class AdminLanguageSever extends React.PureComponent<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = { showingInstruction: false };
  }

  public toggleInstruction = (
    showingInstruction: boolean,
    name?: string,
    url?: string,
    pluginName?: string
  ) => {
    this.setState({ showingInstruction, name, url, pluginName });
  };

  public render() {
    const languageServers = this.props.languageServers.map(ls => (
      <LanguageServerLi
        languageServer={ls}
        key={ls.name}
        requestInstallLanguageServer={() =>
          this.toggleInstruction(true, ls.name, ls.downloadUrl, ls.pluginName)
        }
        loading={this.props.installLoading[ls.name]}
      />
    ));
    return (
      <div>
        <EuiSpacer />
        <EuiText>
          <h3>
            {this.props.languageServers.length}
            {this.props.languageServers.length > 1 ? (
              <span> Language servers</span>
            ) : (
              <span> Language server</span>
            )}
          </h3>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup direction="column" gutterSize="s">
          {languageServers}
        </EuiFlexGroup>
        <LanguageServerInstruction
          show={this.state.showingInstruction}
          name={this.state.name!}
          pluginName={this.state.pluginName!}
          url={this.state.url!}
          close={() => this.toggleInstruction(false)}
        />
      </div>
    );
  }
}

const SupportedOS = [
  { id: 'windows', name: 'Windows' },
  { id: 'linux', name: 'Linux' },
  { id: 'darwin', name: 'macOS' },
];

const LanguageServerInstruction = (props: {
  name: string;
  pluginName: string;
  url: string;
  show: boolean;
  close: () => void;
}) => {
  const tabs = SupportedOS.map(({ id, name }) => {
    const url = props.url ? props.url.replace('$OS', id) : '';
    const installCode = `bin/kibana-plugin install ${url}`;
    return {
      id,
      name,
      content: (
        <div>
          <EuiSpacer />
          <EuiText grow={false}>
            <h3>Install</h3>
            <ol>
              <li>Stop your kibana Code node.</li>
              <li>Use the following command to install the {props.name} language server.</li>
            </ol>
            <EuiCodeBlock language="shell">{installCode}</EuiCodeBlock>
            <h3>Uninstall</h3>
            <ol>
              <li>Stop your kibana Code node.</li>
              <li>Use the following command to remove the {props.name} language server.</li>
            </ol>
            <EuiCodeBlock language="shell">
              bin/kibana-plugin remove {props.pluginName}
            </EuiCodeBlock>
          </EuiText>
        </div>
      ),
    };
  });

  return (
    <React.Fragment>
      {' '}
      {props.show && (
        <EuiOverlayMask>
          <EuiModal onClose={props.close} maxWidth={false}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Installation Instructions</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[1]} size={'m'} />
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={props.close} fill>
                Close
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </React.Fragment>
  );
};

const mapStateToProps = (state: RootState) => ({
  languageServers: state.languageServer.languageServers,
  installLoading: state.languageServer.installServerLoading,
});

const mapDispatchToProps = {
  requestInstallLanguageServer,
};

export const LanguageSeverTab = connect(
  mapStateToProps,
  mapDispatchToProps
)(AdminLanguageSever);
