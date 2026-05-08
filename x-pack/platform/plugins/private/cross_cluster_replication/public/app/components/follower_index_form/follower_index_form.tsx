/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent, Fragment, type ReactElement, type ReactNode } from 'react';
import { debounce } from 'lodash';
import type { DebouncedFunc } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiLoadingLogo,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  type EuiSwitchEvent,
} from '@elastic/eui';

import { extractQueryParams, indices } from '../../../shared_imports';
import { indexNameValidator, leaderIndexValidator } from '../../services/input_validation';
import { routing } from '../../services/routing';
import { getFatalErrors } from '../../services/notifications';
import { loadIndices, type FollowerIndexSaveBody } from '../../services/api';
import { documentationLinks } from '../../services/documentation_links';
import { API_STATUS } from '../../constants';
import { getRemoteClusterName } from '../../services/get_remote_cluster_name';
import type { CcrApiError } from '../../services/http_error';
import { getErrorStatus, isHttpFetchError, toCcrApiError } from '../../services/http_error';
import { RemoteClustersFormField } from '../remote_clusters_form_field';
import { SectionError } from '../section_error';
import { FormEntryRow } from '../form_entry_row';
import {
  getAdvancedSettingsFields,
  getEmptyAdvancedSettings,
  areAdvancedSettingsEdited,
  type AdvancedSettingValidator,
} from './advanced_settings_fields';

import { FollowerIndexRequestFlyout } from './follower_index_request_flyout';
import type {
  ApiStatus,
  FollowerIndex,
  FollowerIndexAdvancedSettings,
} from '../../../../common/types';

const indexNameIllegalCharacters = indices.INDEX_ILLEGAL_CHARACTERS_VISIBLE.join(' ');

type FieldValidator = (value: string | number | undefined) => ReactElement[] | undefined;
type FollowerIndexFormFields = FollowerIndexSaveBody & Pick<FollowerIndex, 'name'>;

const getFieldToValidatorMap = (
  advancedSettingsFields: ReturnType<typeof getAdvancedSettingsFields>
): Record<string, FieldValidator | undefined> => {
  const map: Record<string, FieldValidator | undefined> = {
    name: (value) => indexNameValidator(String(value ?? '')),
    leaderIndex: (value) => leaderIndexValidator(String(value ?? '')),
  };
  for (const advancedSetting of advancedSettingsFields) {
    if (typeof advancedSetting.validator === 'function') {
      const validator: AdvancedSettingValidator = advancedSetting.validator;
      map[advancedSetting.field] = validator;
    }
  }
  return map;
};

const getEmptyFollowerIndex = (remoteClusterName = ''): FollowerIndexFormFields => ({
  name: '',
  remoteCluster: remoteClusterName,
  leaderIndex: '',
  ...getEmptyAdvancedSettings(documentationLinks),
});

type FollowerIndexFieldError =
  | ReactElement[]
  | { message: ReactNode; alwaysVisible?: boolean }
  | undefined
  | null;

interface RemoteClusterOption {
  name: string;
  isConnected: boolean;
}

interface Props {
  saveFollowerIndex: (name: string, followerIndex: FollowerIndexSaveBody) => void;
  clearApiError: () => void;
  followerIndex?: Omit<FollowerIndex, 'shards'>;
  apiError?: CcrApiError | null;
  apiStatus: ApiStatus;
  remoteClusters?: RemoteClusterOption[];
  saveButtonLabel: ReactNode;
  currentUrl: string;
}

interface State {
  isNew: boolean;
  followerIndex: FollowerIndexFormFields;
  fieldsErrors: Record<string, FollowerIndexFieldError | string | undefined>;
  areErrorsVisible: boolean;
  areAdvancedSettingsVisible: boolean;
  isValidatingIndexName: boolean;
  isRequestVisible: boolean;
}

export type FollowerIndexFormState = State;

/**
 * State transitions: fields update
 */
export const updateFields =
  (fields: Partial<FollowerIndexFormFields>) =>
  ({ followerIndex }: Pick<State, 'followerIndex'>) => ({
    followerIndex: {
      ...followerIndex,
      ...fields,
    },
  });

/**
 * State transitions: errors update
 */
export const updateFormErrors =
  (errors: Record<string, FollowerIndexFieldError | string | undefined>) =>
  ({ fieldsErrors }: Pick<State, 'fieldsErrors'>) => ({
    fieldsErrors: {
      ...fieldsErrors,
      ...errors,
    },
  });

export class FollowerIndexForm extends PureComponent<Props, State> {
  cachedAdvancedSettings: Partial<FollowerIndexAdvancedSettings> = {};

  validateIndexName: DebouncedFunc<(name: string) => Promise<void>>;

  constructor(props: Props) {
    super(props);

    const {
      route: {
        location: { search },
      },
    } = routing.reactRouterOrThrow;
    const queryParams = extractQueryParams(search);
    const rawCluster = queryParams.cluster;
    const clusterParam =
      typeof rawCluster === 'string'
        ? rawCluster
        : Array.isArray(rawCluster)
        ? rawCluster[0]
        : undefined;

    const followerIndexProp = this.props.followerIndex;
    const isNew = followerIndexProp === undefined;
    const remoteClusterName = getRemoteClusterName(this.props.remoteClusters ?? [], clusterParam);

    let followerIndex: FollowerIndexFormFields;
    if (followerIndexProp === undefined) {
      followerIndex = getEmptyFollowerIndex(remoteClusterName);
    } else {
      const { status: _status, ...editableFollowerIndex } = followerIndexProp;
      followerIndex = {
        ...getEmptyFollowerIndex(),
        ...editableFollowerIndex,
      };
    }

    const areAdvancedSettingsVisible =
      !isNew && areAdvancedSettingsEdited(followerIndex, documentationLinks);

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

    this.validateIndexName = debounce(this.validateIndexNameImpl, 500, { trailing: true });
  }

  toggleRequest = () => {
    this.setState(({ isRequestVisible }) => ({
      isRequestVisible: !isRequestVisible,
    }));
  };

  onFieldsChange = (fields: Partial<FollowerIndexFormFields>) => {
    this.setState(updateFields(fields));

    const newFields = {
      ...this.state.followerIndex,
      ...fields,
    };

    this.setState(updateFormErrors(this.getFieldsErrors(newFields)));

    if (this.props.apiError) {
      this.props.clearApiError();
    }
  };

  getFieldsErrors = (newFields: Partial<FollowerIndexFormFields>) => {
    const advancedSettings = getAdvancedSettingsFields(documentationLinks);
    const validatorMap = getFieldToValidatorMap(advancedSettings);
    const errors: Record<string, FollowerIndexFieldError | string | undefined> = {};

    for (const [field, value] of Object.entries(newFields)) {
      const validator = validatorMap[field];
      if (validator) {
        errors[field] = validator(value);
      }
    }

    return errors;
  };

  onIndexNameChange = (value: string | number) => {
    const name = String(value);
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

  validateIndexNameImpl = async (name: string) => {
    try {
      const loadedIndices = await loadIndices();
      const doesExist = loadedIndices.some((index) => index.name === name);
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
      const apiError = toCcrApiError(error);
      if (apiError.name === 'AbortError') {
        // Ignore aborted requests
        return;
      }

      // This could be an HTTP error.
      if (isHttpFetchError(apiError)) {
        // All validation does is check for a name collision, so we can just let the user attempt
        // to save the follower index and get an error back from the API.
        return this.setState({
          isValidatingIndexName: false,
        });
      }

      // This error isn't an HTTP error, so let the fatal error screen tell the user something
      // unexpected happened.
      getFatalErrors().add(
        apiError,
        i18n.translate(
          'xpack.crossClusterReplication.followerIndexForm.indexNameValidationFatalErrorTitle',
          {
            defaultMessage: 'Follower Index Form index name validation',
          }
        )
      );
    }
  };

  onClusterChange = (remoteCluster: string) => {
    this.onFieldsChange({ remoteCluster });
  };

  getFields = () => {
    return this.state.followerIndex;
  };

  toggleAdvancedSettings = (event: EuiSwitchEvent) => {
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
    this.onFieldsChange(getEmptyAdvancedSettings(documentationLinks));

    // Save a cache of the advanced settings.
    const fields = this.getFields();
    this.cachedAdvancedSettings = getAdvancedSettingsFields(documentationLinks).reduce<
      Partial<FollowerIndexAdvancedSettings>
    >((cache, { field }) => {
      const value = fields[field];
      if (value !== '') {
        Object.assign(cache, { [field]: value });
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
      (error) => error === undefined || error === null
    );
  }

  sendForm = () => {
    const isFormValid = this.isFormValid();

    this.setState({ areErrorsVisible: !isFormValid });

    if (!isFormValid) {
      return;
    }

    const { name, ...saveBody } = this.getFields();
    this.props.saveFollowerIndex(name, saveBody);
  };

  cancelForm = () => {
    routing.navigate('/follower_indices');
  };

  /**
   * Sections Renders
   */
  renderApiErrors() {
    const { apiError } = this.props;

    if (!apiError) {
      return null;
    }

    const title = i18n.translate(
      'xpack.crossClusterReplication.followerIndexForm.savingErrorTitle',
      {
        defaultMessage: `Can't create follower index`,
      }
    );
    const { leaderIndex } = this.state.followerIndex;
    const error =
      getErrorStatus(apiError) === 404
        ? {
            message: i18n.translate(
              'xpack.crossClusterReplication.followerIndexForm.leaderIndexNotFoundError',
              {
                defaultMessage: `The leader index ''{leaderIndex}'' does not exist.`,
                values: { leaderIndex },
              }
            ),
          }
        : apiError;

    return (
      <Fragment>
        <SectionError title={title} error={error} />
        <EuiSpacer size="l" />
      </Fragment>
    );
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
        remoteClusterNotConnectedNotEditable: (name: string) => ({
          title: (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.currentRemoteClusterNotConnectedCallOutTitle"
              defaultMessage="Can't edit follower index because remote cluster ''{name}'' is not connected"
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
        remoteClusterDoesNotExist: (name: string) => (
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexForm.currentRemoteClusterNotFoundCallOutDescription"
            defaultMessage="To edit this follower index, you must add a remote cluster
              named ''{name}''."
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
            onError={(error) => {
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
        onValueUpdate={(value) => this.onFieldsChange({ leaderIndex: String(value) })}
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
              {getAdvancedSettingsFields(documentationLinks).map((advancedSetting) => {
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
                    onValueUpdate={(value) => this.onFieldsChange({ [field]: value })}
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
      const isFormValid = this.isFormValid();

      if (!areErrorsVisible || isFormValid) {
        return null;
      }

      return (
        <Fragment>
          <EuiCallOut
            role="alert"
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
      const { isRequestVisible } = this.state;

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
                color="success"
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
          <EuiLoadingLogo logo="logoKibana" size="xl" />
        </EuiOverlayMask>
      );
    }
    return null;
  };

  render() {
    const { followerIndex, isRequestVisible } = this.state;
    const { name, ...requestPayload } = this.getFields();

    return (
      <Fragment>
        {this.renderForm()}
        {this.renderLoading()}

        {isRequestVisible ? (
          <FollowerIndexRequestFlyout
            name={name || followerIndex.name}
            followerIndex={requestPayload}
            close={() => this.setState({ isRequestVisible: false })}
          />
        ) : null}
      </Fragment>
    );
  }
}
