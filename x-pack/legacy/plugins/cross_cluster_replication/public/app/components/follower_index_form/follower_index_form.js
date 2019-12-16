/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';
import { fatalError } from 'ui/notify';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiLoadingKibana,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { indexNameValidator, leaderIndexValidator } from '../../services/input_validation';
import routing from '../../services/routing';
import { loadIndices } from '../../services/api';
import { API_STATUS } from '../../constants';
import { SectionError } from '../section_error';
import { FormEntryRow } from '../form_entry_row';
import {
  advancedSettingsFields,
  emptyAdvancedSettings,
  areAdvancedSettingsEdited,
} from './advanced_settings_fields';
import { extractQueryParams } from '../../services/query_params';
import { getRemoteClusterName } from '../../services/get_remote_cluster_name';
import { RemoteClustersFormField } from '../remote_clusters_form_field';

import { FollowerIndexRequestFlyout } from './follower_index_request_flyout';

const indexNameIllegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.join(' ');

const fieldToValidatorMap = advancedSettingsFields.reduce(
  (map, advancedSetting) => {
    const { field, validator } = advancedSetting;
    map[field] = validator;
    return map;
  },
  {
    name: indexNameValidator,
    leaderIndex: leaderIndexValidator,
  }
);

const getEmptyFollowerIndex = (remoteClusterName = '') => ({
  name: '',
  remoteCluster: remoteClusterName,
  leaderIndex: '',
  ...emptyAdvancedSettings,
});

/**
 * State transitions: fields update
 */
export const updateFields = fields => ({ followerIndex }) => ({
  followerIndex: {
    ...followerIndex,
    ...fields,
  },
});

/**
 * State transitions: errors update
 */
export const updateFormErrors = errors => ({ fieldsErrors }) => ({
  fieldsErrors: {
    ...fieldsErrors,
    ...errors,
  },
});

export class FollowerIndexForm extends PureComponent {
  static propTypes = {
    saveFollowerIndex: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    followerIndex: PropTypes.object,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
    remoteClusters: PropTypes.array,
    saveButtonLabel: PropTypes.node,
  };

  constructor(props) {
    super(props);

    const {
      route: {
        location: { search },
      },
    } = routing.reactRouter;
    const queryParams = extractQueryParams(search);

    const isNew = this.props.followerIndex === undefined;
    const remoteClusterName = getRemoteClusterName(this.props.remoteClusters, queryParams.cluster);
    const followerIndex = isNew
      ? getEmptyFollowerIndex(remoteClusterName)
      : {
          ...getEmptyFollowerIndex(),
          ...this.props.followerIndex,
        };

    // eslint-disable-next-line no-nested-ternary
    const areAdvancedSettingsVisible = isNew
      ? false
      : areAdvancedSettingsEdited(followerIndex)
      ? true
      : false;

    const fieldsErrors = this.getFieldsErrors(followerIndex);

    this.state = {
      isNew,
      followerIndex,
      fieldsErrors,
      areErrorsVisible: false,
      areAdvancedSettingsVisible,
      isValidatingIndexName: false,
      isRequestVisible: false,
    };

    this.cachedAdvancedSettings = {};
    this.validateIndexName = debounce(this.validateIndexName, 500);
  }

  toggleRequest = () => {
    this.setState(({ isRequestVisible }) => ({
      isRequestVisible: !isRequestVisible,
    }));
  };

  onFieldsChange = fields => {
    this.setState(updateFields(fields));

    const newFields = {
      ...this.state.fields,
      ...fields,
    };

    this.setState(updateFormErrors(this.getFieldsErrors(newFields)));

    if (this.props.apiError) {
      this.props.clearApiError();
    }
  };

  getFieldsErrors = newFields => {
    return Object.keys(newFields).reduce((errors, field) => {
      const validator = fieldToValidatorMap[field];
      const value = newFields[field];

      if (validator) {
        const error = validator(value);
        errors[field] = error;
      }

      return errors;
    }, {});
  };

  onIndexNameChange = ({ name }) => {
    this.onFieldsChange({ name });

    const error = indexNameValidator(name);
    if (error) {
      // If there is a client side error
      // there is no need to validate the name
      return;
    }

    if (!name || !name.trim()) {
      this.setState({
        isValidatingIndexName: false,
      });

      return;
    }

    this.setState({
      isValidatingIndexName: true,
    });

    this.validateIndexName(name);
  };

  validateIndexName = async name => {
    try {
      const indices = await loadIndices();
      const doesExist = indices.some(index => index.name === name);
      if (doesExist) {
        const error = {
          message: (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.indexAlreadyExistError"
              defaultMessage="An index with the same name already exists."
            />
          ),
          alwaysVisible: true,
        };

        this.setState(updateFormErrors({ name: error }));
      }

      this.setState({
        isValidatingIndexName: false,
      });
    } catch (error) {
      // Expect an error in the shape provided by Angular's $http service.
      if (error && error.data) {
        // All validation does is check for a name collision, so we can just let the user attempt
        // to save the follower index and get an error back from the API.
        return this.setState({
          isValidatingIndexName: false,
        });
      }

      // This error isn't an HTTP error, so let the fatal error screen tell the user something
      // unexpected happened.
      fatalError(
        error,
        i18n.translate(
          'xpack.crossClusterReplication.followerIndexForm.indexNameValidationFatalErrorTitle',
          {
            defaultMessage: 'Follower Index Form index name validation',
          }
        )
      );
    }
  };

  onClusterChange = remoteCluster => {
    this.onFieldsChange({ remoteCluster });
  };

  getFields = () => {
    return this.state.followerIndex;
  };

  toggleAdvancedSettings = event => {
    // If the user edits the advanced settings but then hides them, we need to make sure the
    // edited values don't get sent to the API when the user saves, but we *do* want to restore
    // these values to the form when the user re-opens the advanced settings.
    if (event.target.checked) {
      // Apply the cached advanced settings to the advanced settings form.
      this.onFieldsChange(this.cachedAdvancedSettings);

      // Reset the cache of the advanced settings.
      this.cachedAdvancedSettings = {};

      // Show the advanced settings.
      return this.setState({
        areAdvancedSettingsVisible: true,
      });
    }

    // Clear the advanced settings form.
    this.onFieldsChange(emptyAdvancedSettings);

    // Save a cache of the advanced settings.
    const fields = this.getFields();
    this.cachedAdvancedSettings = advancedSettingsFields.reduce((cache, { field }) => {
      const value = fields[field];
      if (value !== '') {
        cache[field] = value;
      }
      return cache;
    }, {});

    // Hide the advanced settings.
    this.setState({
      areAdvancedSettingsVisible: false,
    });
  };

  isFormValid() {
    return Object.values(this.state.fieldsErrors).every(
      error => error === undefined || error === null
    );
  }

  sendForm = () => {
    const isFormValid = this.isFormValid();

    this.setState({ areErrorsVisible: !isFormValid });

    if (!isFormValid) {
      return;
    }

    const { name, ...followerIndex } = this.getFields();

    this.props.saveFollowerIndex(name, followerIndex);
  };

  cancelForm = () => {
    routing.navigate('/follower_indices');
  };

  /**
   * Sections Renders
   */
  renderApiErrors() {
    const { apiError } = this.props;

    if (apiError) {
      const title = i18n.translate(
        'xpack.crossClusterReplication.followerIndexForm.savingErrorTitle',
        {
          defaultMessage: `Can't create follower index`,
        }
      );
      const { leaderIndex } = this.state.followerIndex;
      const error =
        apiError.status === 404
          ? {
              data: {
                message: i18n.translate(
                  'xpack.crossClusterReplication.followerIndexForm.leaderIndexNotFoundError',
                  {
                    defaultMessage: `The leader index '{leaderIndex}' does not exist.`,
                    values: { leaderIndex },
                  }
                ),
              },
            }
          : apiError;

      return (
        <Fragment>
          <SectionError title={title} error={error} />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    return null;
  }

  renderForm = () => {
    const {
      followerIndex,
      isNew,
      areErrorsVisible,
      areAdvancedSettingsVisible,
      fieldsErrors,
      isValidatingIndexName,
    } = this.state;

    /**
     * Follower index name
     */

    const indexNameHelpText = (
      <Fragment>
        {isValidatingIndexName && (
          <p>
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.indexNameValidatingLabel"
              defaultMessage="Checking availability…"
            />
          </p>
        )}
        <p>
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel"
            defaultMessage="Spaces and the characters {characterList} are not allowed."
            values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
          />
        </p>
      </Fragment>
    );

    const indexNameLabel = i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameTitle',
      {
        defaultMessage: 'Follower index',
      }
    );

    const renderFollowerIndexName = () => (
      <FormEntryRow
        field="name"
        value={followerIndex.name}
        error={fieldsErrors.name}
        title={
          <EuiTitle size="s">
            <h2>{indexNameLabel}</h2>
          </EuiTitle>
        }
        label={indexNameLabel}
        description={i18n.translate(
          'xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameDescription',
          {
            defaultMessage: 'A unique name for your index.',
          }
        )}
        helpText={indexNameHelpText}
        isLoading={isValidatingIndexName}
        disabled={!isNew}
        areErrorsVisible={areErrorsVisible}
        onValueUpdate={this.onIndexNameChange}
        testSubj="followerIndexInput"
      />
    );

    /**
     * Remote Cluster
     */
    const renderRemoteClusterField = () => {
      const { remoteClusters, currentUrl } = this.props;

      const errorMessages = {
        noClusterFound: () => (
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexForm.emptyRemoteClustersCallOutDescription"
            defaultMessage="Replication requires a leader index on a remote cluster."
          />
        ),
        remoteClusterNotConnectedNotEditable: name => ({
          title: (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.currentRemoteClusterNotConnectedCallOutTitle"
              defaultMessage="Can't edit follower index because remote cluster '{name}' is not connected"
              values={{ name }}
            />
          ),
          description: (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.currentRemoteClusterNotConnectedCallOutDescription"
              defaultMessage="You can address this by editing the remote cluster."
            />
          ),
        }),
        remoteClusterDoesNotExist: name => (
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexForm.currentRemoteClusterNotFoundCallOutDescription"
            defaultMessage="To edit this follower index, you must add a remote cluster
              named '{name}'."
            values={{ name }}
          />
        ),
      };

      return (
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.sectionRemoteClusterTitle"
                  defaultMessage="Remote cluster"
                />
              </h2>
            </EuiTitle>
          }
          description={
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.sectionRemoteClusterDescription"
              defaultMessage="The cluster that contains the index to replicate."
            />
          }
          fullWidth
        >
          <RemoteClustersFormField
            selected={followerIndex.remoteCluster ? followerIndex.remoteCluster : null}
            remoteClusters={remoteClusters || []}
            currentUrl={currentUrl}
            isEditable={isNew}
            areErrorsVisible={areErrorsVisible}
            onChange={this.onClusterChange}
            onError={error => {
              this.setState(updateFormErrors({ remoteCluster: error }));
            }}
            errorMessages={errorMessages}
          />
        </EuiDescribedFormGroup>
      );
    };

    /**
     * Leader index
     */

    const leaderIndexLabel = i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexTitle',
      {
        defaultMessage: 'Leader index',
      }
    );

    const renderLeaderIndex = () => (
      <FormEntryRow
        field="leaderIndex"
        value={followerIndex.leaderIndex}
        error={fieldsErrors.leaderIndex}
        title={
          <EuiTitle size="s">
            <h2>{leaderIndexLabel}</h2>
          </EuiTitle>
        }
        label={leaderIndexLabel}
        description={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexDescription"
                defaultMessage="The index on the remote cluster to replicate to the follower index."
              />
            </p>

            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexDescription2"
                defaultMessage="{note} The leader index must already exist."
                values={{
                  note: (
                    <strong>
                      <FormattedMessage
                        id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexDescription2.noteLabel"
                        defaultMessage="Note:"
                      />
                    </strong>
                  ),
                }}
              />
            </p>
          </Fragment>
        }
        helpText={
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel"
            defaultMessage="Spaces and the characters {characterList} are not allowed."
            values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
          />
        }
        disabled={!isNew}
        areErrorsVisible={areErrorsVisible}
        onValueUpdate={this.onFieldsChange}
        testSubj="leaderIndexInput"
      />
    );

    /**
     * Advanced settings
     */

    const renderAdvancedSettings = () => {
      return (
        <Fragment>
          <EuiHorizontalRule />
          <EuiDescribedFormGroup
            title={
              <EuiTitle size="s">
                <h2>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.advancedSettingsTitle"
                    defaultMessage="Advanced settings (optional)"
                  />
                </h2>
              </EuiTitle>
            }
            description={
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.advancedSettingsDescription"
                    defaultMessage="Advanced settings control the rate of replication. You can
                      customize these settings or use the default values."
                  />
                </p>

                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndex.advancedSettingsForm.showSwitchLabel"
                      defaultMessage="Customize advanced settings"
                    />
                  }
                  checked={areAdvancedSettingsVisible}
                  onChange={this.toggleAdvancedSettings}
                  data-test-subj="advancedSettingsToggle"
                />
              </Fragment>
            }
            fullWidth
          >
            <Fragment /> {/* Avoid missing `children` warning */}
          </EuiDescribedFormGroup>

          {areAdvancedSettingsVisible && (
            <Fragment>
              <EuiSpacer size="s" />
              {advancedSettingsFields.map(advancedSetting => {
                const {
                  field,
                  testSubject,
                  title,
                  description,
                  label,
                  helpText,
                  defaultValue,
                  type,
                } = advancedSetting;
                return (
                  <FormEntryRow
                    key={field}
                    field={field}
                    value={followerIndex[field]}
                    defaultValue={defaultValue}
                    error={fieldsErrors[field]}
                    title={
                      <EuiTitle size="xs">
                        <h3>{title}</h3>
                      </EuiTitle>
                    }
                    description={description}
                    label={label}
                    helpText={helpText}
                    type={type}
                    areErrorsVisible={areErrorsVisible}
                    onValueUpdate={this.onFieldsChange}
                    testSubj={testSubject}
                  />
                );
              })}
            </Fragment>
          )}
          <EuiHorizontalRule />
        </Fragment>
      );
    };

    /**
     * Form Error warning message
     */
    const renderFormErrorWarning = () => {
      const { areErrorsVisible } = this.state;
      const isFormValid = this.isFormValid();

      if (!areErrorsVisible || isFormValid) {
        return null;
      }

      return (
        <Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.validationErrorTitle"
                defaultMessage="Fix errors before continuing."
              />
            }
            color="danger"
            iconType="cross"
            data-test-subj="formError"
          />

          <EuiSpacer size="l" />
        </Fragment>
      );
    };

    /**
     * Form Actions
     */
    const renderActions = () => {
      const { apiStatus, saveButtonLabel } = this.props;
      const { areErrorsVisible, isRequestVisible } = this.state;

      if (apiStatus === API_STATUS.SAVING) {
        return (
          <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.actions.savingText"
                  defaultMessage="Saving"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      const isSaveDisabled = areErrorsVisible && !this.isFormValid();

      return (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                color="secondary"
                iconType="check"
                onClick={this.sendForm}
                fill
                disabled={isSaveDisabled}
                data-test-subj="submitButton"
              >
                {saveButtonLabel}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="primary"
                onClick={this.cancelForm}
                data-test-subj="cancelButton"
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={this.toggleRequest}>
              {isRequestVisible ? (
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.hideRequestButtonLabel"
                  defaultMessage="Hide request"
                />
              ) : (
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.showRequestButtonLabel"
                  defaultMessage="Show request"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return (
      <Fragment>
        <EuiForm data-test-subj="followerIndexForm">
          {renderRemoteClusterField()}
          {renderLeaderIndex()}
          {renderFollowerIndexName()}
          <EuiSpacer size="s" />
          {renderAdvancedSettings()}
        </EuiForm>

        {renderFormErrorWarning()}
        {this.renderApiErrors()}
        {renderActions()}
      </Fragment>
    );
  };

  renderLoading = () => {
    const { apiStatus } = this.props;

    if (apiStatus === API_STATUS.SAVING) {
      return (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl" />
        </EuiOverlayMask>
      );
    }
    return null;
  };

  render() {
    const { followerIndex, isRequestVisible } = this.state;

    return (
      <Fragment>
        {this.renderForm()}
        {this.renderLoading()}

        {isRequestVisible ? (
          <FollowerIndexRequestFlyout
            name={followerIndex.name}
            followerIndex={this.getFields()}
            close={() => this.setState({ isRequestVisible: false })}
          />
        ) : null}
      </Fragment>
    );
  }
}
