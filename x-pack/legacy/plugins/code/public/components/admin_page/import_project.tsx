/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiGlobalToastList,
  EuiSpacer,
} from '@elastic/eui';
import React, { ChangeEvent } from 'react';
import { connect } from 'react-redux';
import { closeToast, importRepo } from '../../actions';
import { RootState } from '../../reducers';
import { ToastType } from '../../reducers/repository';
import { isImportRepositoryURLInvalid } from '../../utils/url';

class CodeImportProject extends React.PureComponent<
  {
    importRepo: (p: string) => void;
    importLoading: boolean;
    toastMessage?: string;
    showToast: boolean;
    toastType?: ToastType;
    closeToast: () => void;
  },
  { value: string; isInvalid: boolean }
> {
  public state = {
    value: '',
    isInvalid: false,
  };

  public onChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      value: e.target.value,
      isInvalid: isImportRepositoryURLInvalid(e.target.value),
    });
  };

  public submitImportProject = () => {
    if (!isImportRepositoryURLInvalid(this.state.value)) {
      this.props.importRepo(this.state.value);
    } else if (!this.state.isInvalid) {
      this.setState({ isInvalid: true });
    }
  };

  public updateIsInvalid = () => {
    this.setState({ isInvalid: isImportRepositoryURLInvalid(this.state.value) });
  };

  public render() {
    const { importLoading, toastMessage, showToast, toastType } = this.props;

    return (
      <div className="codeContainer__import">
        {showToast && (
          <EuiGlobalToastList
            toasts={[{ title: '', color: toastType, text: toastMessage, id: toastMessage || '' }]}
            dismissToast={this.props.closeToast}
            toastLifeTimeMs={6000}
          />
        )}
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label="Repository URL"
              helpText="e.g. https://github.com/Microsoft/TypeScript-Node-Starter"
              fullWidth
              isInvalid={this.state.isInvalid}
              error="The URL shouldn't be empty."
            >
              <EuiFieldText
                value={this.state.value}
                onChange={this.onChange}
                aria-label="input project url"
                data-test-subj="importRepositoryUrlInputBox"
                isLoading={importLoading}
                fullWidth={true}
                onBlur={this.updateIsInvalid}
                isInvalid={this.state.isInvalid}
                autoFocus={true}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/*
  // @ts-ignore */}
            <EuiButton
              className="codeButton__projectImport"
              onClick={this.submitImportProject}
              data-test-subj="importRepositoryButton"
            >
              Import
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  importLoading: state.repository.importLoading,
  toastMessage: state.repository.toastMessage,
  toastType: state.repository.toastType,
  showToast: state.repository.showToast,
});

const mapDispatchToProps = {
  importRepo,
  closeToast,
};

export const ImportProject = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeImportProject);
