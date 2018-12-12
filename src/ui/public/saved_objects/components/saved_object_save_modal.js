/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiFieldText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiCallOut,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

export class SavedObjectSaveModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      title: props.title,
      copyOnSave: false,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
      isLoading: false,
    };
  }
  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  onTitleDuplicate = () => {
    this.setState({
      isLoading: false,
      isTitleDuplicateConfirmed: true,
      hasTitleDuplicate: true,
    });
  }

  saveSavedObject = async () => {
    if (this.state.isLoading) {
      // ignore extra clicks
      return;
    }

    this.setState({
      isLoading: true,
    });

    await this.props.onSave({
      newTitle: this.state.title,
      newCopyOnSave: this.state.copyOnSave,
      isTitleDuplicateConfirmed: this.state.isTitleDuplicateConfirmed,
      onTitleDuplicate: this.onTitleDuplicate,
    });
  };

  onTitleChange = (event) => {
    this.setState({
      title: event.target.value,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
    });
  };

  onCopyOnSaveChange = (event) => {
    this.setState({
      copyOnSave: event.target.checked,
    });
  }

  renderDuplicateTitleCallout = () => {
    if (!this.state.hasTitleDuplicate) {
      return;
    }

    return (
      <Fragment>
        <EuiCallOut
          title={(<FormattedMessage
            id="common.ui.savedObjects.saveModal.duplicateTitleLabel"
            defaultMessage="A {objectType} with the title '{title}' already exists."
            values={{ objectType: this.props.objectType, title: this.state.title }}
          />)}
          color="warning"
          data-test-subj="titleDupicateWarnMsg"
        >
          <p>
            <FormattedMessage
              id="common.ui.savedObjects.saveModal.duplicateTitleDescription"
              defaultMessage="Click {confirmSaveLabel} to save the {objectType} with the duplicate title."
              values={{
                objectType: this.props.objectType,
                confirmSaveLabel: (
                  <strong>
                    <FormattedMessage
                      id="common.ui.savedObjects.saveModal.duplicateTitleDescription.confirmSaveText"
                      defaultMessage="Confirm Save"
                    />
                  </strong>
                )
              }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  renderCopyOnSave = () => {
    if (!this.props.showCopyOnSave) {
      return;
    }

    return (
      <EuiFormRow
        label={(<FormattedMessage
          id="common.ui.savedObjects.saveModal.saveAsNewLabel"
          defaultMessage="Save as a new {objectType}"
          values={{ objectType: this.props.objectType }}
        />)}
      >
        <EuiSwitch
          data-test-subj="saveAsNewCheckbox"
          checked={this.state.copyOnSave}
          onChange={this.onCopyOnSaveChange}
        />
      </EuiFormRow>
    );
  }

  render() {
    return (
      <EuiOverlayMask>
        <EuiModal
          data-test-subj="savedObjectSaveModal"
          className="dshSaveModal"
          onClose={this.props.onClose}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="common.ui.savedObjects.saveModal.saveTitle"
                defaultMessage="Save {objectType}"
                values={{ objectType: this.props.objectType }}
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>

            {this.renderDuplicateTitleCallout()}

            <EuiForm>

              {this.renderCopyOnSave()}

              <EuiFormRow
                label={(<FormattedMessage
                  id="common.ui.savedObjects.saveModal.titleLabel"
                  defaultMessage="Title"
                />)}
              >
                <EuiFieldText
                  autoFocus
                  data-test-subj="savedObjectTitle"
                  value={this.state.title}
                  onChange={this.onTitleChange}
                  isInvalid={this.state.hasTitleDuplicate || this.state.title.length === 0}
                />
              </EuiFormRow>

              {this.props.options}

            </EuiForm>

          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton
              data-test-subj="saveCancelButton"
              onClick={this.props.onClose}
            >
              <FormattedMessage
                id="common.ui.savedObjects.saveModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButton>

            <EuiButton
              fill
              data-test-subj="confirmSaveSavedObjectButton"
              onClick={this.saveSavedObject}
              isLoading={this.state.isLoading}
              isDisabled={this.state.title.length === 0}
            >
              <FormattedMessage
                id="common.ui.savedObjects.saveModal.confirmSaveButtonLabel"
                defaultMessage="Confirm Save"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }
}

SavedObjectSaveModal.propTypes = {
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  showCopyOnSave: PropTypes.bool.isRequired,
  objectType: PropTypes.string.isRequired,
  options: PropTypes.node,
};
