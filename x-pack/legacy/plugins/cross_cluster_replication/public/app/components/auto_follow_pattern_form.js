/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiLoadingKibana,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/index_patterns';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

import routing from '../services/routing';
import { extractQueryParams } from '../services/query_params';
import { getRemoteClusterName } from '../services/get_remote_cluster_name';
import { API_STATUS } from '../constants';
import { SectionError } from './section_error';
import { AutoFollowPatternIndicesPreview } from './auto_follow_pattern_indices_preview';
import { RemoteClustersFormField } from './remote_clusters_form_field';
import {
  validateAutoFollowPattern,
  validateLeaderIndexPattern,
} from '../services/auto_follow_pattern_validators';

import { AutoFollowPatternRequestFlyout } from './auto_follow_pattern_request_flyout';

const indexPatternIllegalCharacters = INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.join(' ');
const indexNameIllegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.join(' ');

const getEmptyAutoFollowPattern = (remoteClusterName = '') => ({
  name: '',
  remoteCluster: remoteClusterName,
  leaderIndexPatterns: [],
  followIndexPatternPrefix: '',
  followIndexPatternSuffix: '',
});

export const updateFormErrors = (errors, existingErrors) => ({
  fieldsErrors: {
    ...existingErrors,
    ...errors,
  },
});

export class AutoFollowPatternForm extends PureComponent {
  static propTypes = {
    saveAutoFollowPattern: PropTypes.func.isRequired,
    autoFollowPattern: PropTypes.object,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
    currentUrl: PropTypes.string.isRequired,
    remoteClusters: PropTypes.array,
    saveButtonLabel: PropTypes.node,
  };

  constructor(props) {
    super(props);

    const isNew = this.props.autoFollowPattern === undefined;
    const {
      route: {
        location: { search },
      },
    } = routing.reactRouter;
    const queryParams = extractQueryParams(search);
    const remoteClusterName = getRemoteClusterName(this.props.remoteClusters, queryParams.cluster);
    const autoFollowPattern = isNew
      ? getEmptyAutoFollowPattern(remoteClusterName)
      : {
          ...this.props.autoFollowPattern,
        };

    this.state = {
      autoFollowPattern,
      fieldsErrors: validateAutoFollowPattern(autoFollowPattern),
      areErrorsVisible: false,
      isNew,
      isRequestVisible: false,
    };
  }

  toggleRequest = () => {
    this.setState(({ isRequestVisible }) => ({
      isRequestVisible: !isRequestVisible,
    }));
  };

  onFieldsChange = fields => {
    this.setState(({ autoFollowPattern }) => ({
      autoFollowPattern: {
        ...autoFollowPattern,
        ...fields,
      },
    }));

    const errors = validateAutoFollowPattern(fields);
    this.onFieldsErrorChange(errors);
  };

  onFieldsErrorChange = errors =>
    this.setState(({ fieldsErrors }) => updateFormErrors(errors, fieldsErrors));

  onClusterChange = remoteCluster => {
    this.onFieldsChange({ remoteCluster });
  };

  onCreateLeaderIndexPattern = indexPattern => {
    const error = validateLeaderIndexPattern(indexPattern);

    if (error) {
      const errors = {
        leaderIndexPatterns: {
          ...error,
          alwaysVisible: true,
        },
      };

      this.setState(({ fieldsErrors }) => updateFormErrors(errors, fieldsErrors));

      // Return false to explicitly reject the user's input.
      return false;
    }

    const {
      autoFollowPattern: { leaderIndexPatterns },
    } = this.state;

    const newLeaderIndexPatterns = [...leaderIndexPatterns, indexPattern];

    this.onFieldsChange({ leaderIndexPatterns: newLeaderIndexPatterns });
  };

  onLeaderIndexPatternChange = indexPatterns => {
    this.onFieldsChange({
      leaderIndexPatterns: indexPatterns.map(({ label }) => label),
    });
  };

  onLeaderIndexPatternInputChange = leaderIndexPattern => {
    const isEmpty = !leaderIndexPattern || !leaderIndexPattern.trim();
    const {
      autoFollowPattern: { leaderIndexPatterns },
    } = this.state;

    if (!isEmpty && leaderIndexPatterns.includes(leaderIndexPattern)) {
      const errorMsg = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPatternForm.leaderIndexPatternError.duplicateMessage',
        {
          defaultMessage: `Duplicate leader index pattern aren't allowed.`,
        }
      );

      const errors = {
        leaderIndexPatterns: {
          message: errorMsg,
          alwaysVisible: true,
        },
      };

      this.setState(({ fieldsErrors }) => updateFormErrors(errors, fieldsErrors));
    } else {
      this.setState(({ fieldsErrors, autoFollowPattern: { leaderIndexPatterns } }) => {
        const errors = Boolean(leaderIndexPatterns.length)
          ? // Validate existing patterns, so we can surface an error if this required input is missing.
            validateAutoFollowPattern({ leaderIndexPatterns })
          : // Validate the input as the user types so they have immediate feedback about errors.
            validateAutoFollowPattern({ leaderIndexPatterns: [leaderIndexPattern] });

        return updateFormErrors(errors, fieldsErrors);
      });
    }
  };

  getFields = () => {
    const { autoFollowPattern: stateFields } = this.state;
    const { followIndexPatternPrefix, followIndexPatternSuffix, ...rest } = stateFields;

    return {
      ...rest,
      followIndexPattern: `${followIndexPatternPrefix}{{leader_index}}${followIndexPatternSuffix}`,
    };
  };

  isFormValid() {
    return Object.values(this.state.fieldsErrors).every(
      error => error === undefined || error === null
    );
  }

  sendForm = () => {
    const isFormValid = this.isFormValid();

    if (!isFormValid) {
      this.setState({ areErrorsVisible: true });
      return;
    }

    this.setState({ areErrorsVisible: false });

    const { name, ...autoFollowPattern } = this.getFields();
    this.props.saveAutoFollowPattern(name, autoFollowPattern);
  };

  cancelForm = () => {
    routing.navigate('/auto_follow_patterns');
  };

  /**
   * Secctions Renders
   */
  renderApiErrors() {
    const { apiError } = this.props;

    if (apiError) {
      const title = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPatternForm.savingErrorTitle',
        {
          defaultMessage: `Can't create auto-follow pattern`,
        }
      );

      return (
        <Fragment>
          <SectionError title={title} error={apiError} data-test-subj="apiError" />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    return null;
  }

  renderForm = () => {
    const {
      autoFollowPattern: {
        name,
        remoteCluster,
        leaderIndexPatterns,
        followIndexPatternPrefix,
        followIndexPatternSuffix,
      },
      isNew,
      areErrorsVisible,
      fieldsErrors,
    } = this.state;

    /**
     * Auto-follow pattern Name
     */
    const renderAutoFollowPatternName = () => {
      const isInvalid = areErrorsVisible && !!fieldsErrors.name;

      return (
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternNameTitle"
                  defaultMessage="Name"
                />
              </h4>
            </EuiTitle>
          }
          description={
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternNameDescription"
              defaultMessage="A unique name for the auto-follow pattern."
            />
          }
          fullWidth
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPatternName.fieldNameLabel"
                defaultMessage="Name"
              />
            }
            error={fieldsErrors.name}
            isInvalid={isInvalid}
            fullWidth
          >
            <EuiFieldText
              isInvalid={isInvalid}
              value={name}
              onChange={e => this.onFieldsChange({ name: e.target.value })}
              fullWidth
              disabled={!isNew}
              data-test-subj="nameInput"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      );
    };

    /**
     * Remote Cluster
     */
    const renderRemoteClusterField = () => {
      const { remoteClusters, currentUrl } = this.props;

      const errorMessages = {
        noClusterFound: () => (
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternForm.emptyRemoteClustersCallOutDescription"
            defaultMessage="Auto-follow patterns capture indices on remote clusters."
          />
        ),
        remoteClusterNotConnectedNotEditable: name => ({
          title: (
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.currentRemoteClusterNotConnectedCallOutTitle"
              defaultMessage="Can't edit auto-follow pattern because remote cluster '{name}' is not connected"
              values={{ name }}
            />
          ),
          description: (
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.currentRemoteClusterNotConnectedCallOutDescription"
              defaultMessage="You can address this by editing the remote cluster."
            />
          ),
        }),
        remoteClusterDoesNotExist: name => (
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternForm.currentRemoteClusterNotFoundCallOutDescription"
            defaultMessage="To edit this auto-follow pattern, you must add a remote cluster
              named '{name}'."
            values={{ name }}
          />
        ),
      };

      return (
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionRemoteClusterTitle"
                  defaultMessage="Remote cluster"
                />
              </h4>
            </EuiTitle>
          }
          description={
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.sectionRemoteClusterDescription"
              defaultMessage="The remote cluster to replicate leader indices from."
            />
          }
          fullWidth
        >
          <RemoteClustersFormField
            selected={remoteCluster ? remoteCluster : null}
            remoteClusters={remoteClusters}
            currentUrl={currentUrl}
            isEditable={isNew}
            areErrorsVisible={areErrorsVisible}
            onChange={this.onClusterChange}
            onError={error => this.onFieldsErrorChange({ remoteCluster: error })}
            errorMessages={errorMessages}
          />
        </EuiDescribedFormGroup>
      );
    };

    /**
     * Leader index pattern(s)
     */
    const renderLeaderIndexPatterns = () => {
      const hasError = !!(
        fieldsErrors.leaderIndexPatterns && fieldsErrors.leaderIndexPatterns.message
      );
      const isInvalid =
        hasError && (fieldsErrors.leaderIndexPatterns.alwaysVisible || areErrorsVisible);
      const formattedLeaderIndexPatterns = leaderIndexPatterns.map(pattern => ({ label: pattern }));

      return (
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsTitle"
                  defaultMessage="Leader indices"
                />
              </h4>
            </EuiTitle>
          }
          description={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsDescription1"
                  defaultMessage="One or more index patterns that identify the indices you want to
                    replicate from the remote cluster. As new indices matching these patterns are
                    created, they are replicated to follower indices on the local cluster."
                />
              </p>

              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsDescription2"
                  defaultMessage="{note} Indices that already exist are not replicated."
                  values={{
                    note: (
                      <strong>
                        <FormattedMessage
                          id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsDescription2.noteLabel"
                          defaultMessage="Note:"
                        />
                      </strong>
                    ),
                  }}
                />
              </p>
            </Fragment>
          }
          fullWidth
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.fieldLeaderIndexPatternsLabel"
                defaultMessage="Index patterns"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.fieldLeaderIndexPatternsHelpLabel"
                defaultMessage="Spaces and the characters {characterList} are not allowed."
                values={{ characterList: <strong>{indexPatternIllegalCharacters}</strong> }}
              />
            }
            isInvalid={isInvalid}
            error={fieldsErrors.leaderIndexPatterns && fieldsErrors.leaderIndexPatterns.message}
            fullWidth
          >
            <EuiComboBox
              noSuggestions
              placeholder={i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternForm.fieldLeaderIndexPatternsPlaceholder',
                {
                  defaultMessage: 'Type and then hit ENTER',
                }
              )}
              selectedOptions={formattedLeaderIndexPatterns}
              onCreateOption={this.onCreateLeaderIndexPattern}
              onChange={this.onLeaderIndexPatternChange}
              onSearchChange={this.onLeaderIndexPatternInputChange}
              fullWidth
              data-test-subj="indexPatternInput"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      );
    };

    /**
     * Auto-follow pattern prefix/suffix
     */
    const renderAutoFollowPatternPrefixSuffix = () => {
      const isPrefixInvalid = areErrorsVisible && !!fieldsErrors.followIndexPatternPrefix;
      const isSuffixInvalid = areErrorsVisible && !!fieldsErrors.followIndexPatternSuffix;

      return (
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternTitle"
                  defaultMessage="Follower indices (optional)"
                />
              </h4>
            </EuiTitle>
          }
          description={
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternDescription"
              defaultMessage="A custom prefix or suffix to apply to the names of the follower
                indices so you can more easily identify replicated indices. By default, a follower
                index has the same name as the leader index."
            />
          }
          fullWidth
        >
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFormRow
                className="ccrFollowerIndicesFormRow"
                label={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPattern.fieldPrefixLabel"
                    defaultMessage="Prefix"
                  />
                }
                error={fieldsErrors.followIndexPatternPrefix}
                isInvalid={isPrefixInvalid}
                fullWidth
              >
                <EuiFieldText
                  isInvalid={isPrefixInvalid}
                  value={followIndexPatternPrefix}
                  onChange={e => this.onFieldsChange({ followIndexPatternPrefix: e.target.value })}
                  fullWidth
                  data-test-subj="prefixInput"
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFormRow
                className="ccrFollowerIndicesFormRow"
                label={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPattern.fieldSuffixLabel"
                    defaultMessage="Suffix"
                  />
                }
                error={fieldsErrors.followIndexPatternSuffix}
                isInvalid={isSuffixInvalid}
                fullWidth
              >
                <EuiFieldText
                  isInvalid={isSuffixInvalid}
                  value={followIndexPatternSuffix}
                  onChange={e => this.onFieldsChange({ followIndexPatternSuffix: e.target.value })}
                  fullWidth
                  data-test-subj="suffixInput"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFormHelpText
            className={isPrefixInvalid || isSuffixInvalid ? null : 'ccrFollowerIndicesHelpText'}
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.fieldFollowerIndicesHelpLabel"
              defaultMessage="Spaces and the characters {characterList} are not allowed."
              values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
            />
          </EuiFormHelpText>

          {!!leaderIndexPatterns.length && (
            <Fragment>
              <EuiSpacer size="m" />
              <AutoFollowPatternIndicesPreview
                prefix={followIndexPatternPrefix}
                suffix={followIndexPatternSuffix}
                leaderIndexPatterns={leaderIndexPatterns}
              />
            </Fragment>
          )}
        </EuiDescribedFormGroup>
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
                id="xpack.crossClusterReplication.autoFollowPatternForm.validationErrorTitle"
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
                  id="xpack.crossClusterReplication.autoFollowPatternForm.actions.savingText"
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
              <EuiButtonEmpty color="primary" onClick={this.cancelForm}>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                  data-test-subj="cancelButton"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={this.toggleRequest}>
              {isRequestVisible ? (
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.hideRequestButtonLabel"
                  defaultMessage="Hide request"
                />
              ) : (
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternFormm.showRequestButtonLabel"
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
        <EuiForm data-test-subj="autoFollowPatternForm">
          {renderAutoFollowPatternName()}
          {renderRemoteClusterField()}
          {renderLeaderIndexPatterns()}
          {renderAutoFollowPatternPrefixSuffix()}
        </EuiForm>
        <EuiSpacer />
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
    const { autoFollowPattern, isRequestVisible, isNew } = this.state;

    return (
      <Fragment>
        {this.renderForm()}
        {this.renderLoading()}

        {isRequestVisible ? (
          <AutoFollowPatternRequestFlyout
            name={autoFollowPattern.name}
            autoFollowPattern={this.getFields()}
            isNew={isNew}
            close={() => this.setState({ isRequestVisible: false })}
          />
        ) : null}
      </Fragment>
    );
  }
}
