/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, PureComponent, type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiFormErrorText,
  EuiFormRow,
  EuiSpacer,
  EuiSelect,
  EuiFieldText,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';

import { routing } from '../services/routing';

export interface RemoteClustersFormFieldErrorMessages {
  noClusterFound: () => ReactNode;
  remoteClusterNotConnectedEditable?: (name: string) => {
    title: ReactNode;
    description: ReactNode;
  };
  remoteClusterNotConnectedNotEditable?: (name: string) => {
    title: ReactNode;
    description: ReactNode;
  };
  remoteClusterDoesNotExist?: (name: string) => ReactNode;
}

interface RemoteClusterRow {
  name: string;
  isConnected: boolean;
}

interface Props {
  selected: string | null;
  remoteClusters: RemoteClusterRow[];
  currentUrl: string;
  isEditable: boolean;
  areErrorsVisible: boolean;
  onChange: (clusterName: string) => void;
  onError: (error: { message: ReactNode } | null) => void;
  errorMessages: RemoteClustersFormFieldErrorMessages;
}

const errorMessages = {
  noClusterFound: () => (
    <FormattedMessage
      id="xpack.crossClusterReplication.remoteClustersFormField.emptyRemoteClustersCallOutDescription"
      defaultMessage="You need at least one remote cluster to create a follower index."
    />
  ),
  remoteClusterNotConnectedEditable: (name: string) => ({
    title: (
      <FormattedMessage
        id="xpack.crossClusterReplication.remoteClustersFormField.currentRemoteClusterNotConnectedCallOutTitle"
        defaultMessage="Remote cluster ''{name}'' is not connected"
        values={{ name }}
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.crossClusterReplication.remoteClustersFormField.currentRemoteClusterNotConnectedCallOutDescription"
        defaultMessage="Edit the remote cluster or select a cluster that is connected."
      />
    ),
  }),
};

export class RemoteClustersFormField extends PureComponent<Props> {
  errorMessages: RemoteClustersFormFieldErrorMessages = {
    ...errorMessages,
    ...this.props.errorMessages,
  };

  componentDidMount() {
    const { selected, onError } = this.props;
    const { error } = this.validateRemoteCluster(selected);

    onError(error);
  }

  validateRemoteCluster(clusterName: string | null) {
    const { remoteClusters } = this.props;
    const remoteCluster = remoteClusters.find((c) => c.name === clusterName);

    return remoteCluster && remoteCluster.isConnected
      ? { error: null }
      : {
          error: {
            message: (
              <FormattedMessage
                id="xpack.crossClusterReplication.remoteClustersFormField.invalidRemoteClusterError"
                defaultMessage="Invalid remote cluster"
              />
            ),
          },
        };
  }

  onRemoteClusterChange = (cluster: string) => {
    const { onChange, onError } = this.props;
    const { error } = this.validateRemoteCluster(cluster);
    onChange(cluster);
    onError(error);
  };

  renderNotEditable = () => {
    const { areErrorsVisible } = this.props;
    const errorMessage = this.renderErrorMessage();

    return (
      <Fragment>
        <EuiFieldText
          value={this.props.selected ?? ''}
          fullWidth
          disabled
          isInvalid={areErrorsVisible && Boolean(errorMessage)}
          data-test-subj="remoteClusterInput"
        />
        {areErrorsVisible && Boolean(errorMessage) ? this.renderValidRemoteClusterRequired() : null}
        {errorMessage}
      </Fragment>
    );
  };

  renderValidRemoteClusterRequired = () => (
    <EuiFormErrorText>
      <FormattedMessage
        id="xpack.crossClusterReplication.remoteClustersFormField.validRemoteClusterRequired"
        defaultMessage="A connected remote cluster is required."
      />
    </EuiFormErrorText>
  );

  renderDropdown = () => {
    const { remoteClusters, selected, currentUrl, areErrorsVisible } = this.props;
    const hasClusters = Boolean(remoteClusters.length);
    const remoteClustersOptions = hasClusters
      ? remoteClusters.map(({ name, isConnected }) => ({
          value: name,
          text: isConnected
            ? name
            : i18n.translate(
                'xpack.crossClusterReplication.remoteClustersFormField.remoteClusterDropdownNotConnected',
                {
                  defaultMessage: '{name} (not connected)',
                  values: { name },
                }
              ),
          'data-test-subj': `option-${name}`,
        }))
      : [];
    const errorMessage = this.renderErrorMessage();

    return (
      <Fragment>
        <EuiSelect
          fullWidth
          options={remoteClustersOptions}
          value={hasClusters ? selected ?? '' : ''}
          onChange={(e) => {
            this.onRemoteClusterChange(e.target.value);
          }}
          hasNoInitialSelection={!hasClusters}
          isInvalid={areErrorsVisible && Boolean(errorMessage)}
          data-test-subj="remoteClusterSelect"
          aria-label={i18n.translate(
            'xpack.crossClusterReplication.remoteClustersFormField.remoteClusterSelectAriaLabel',
            {
              defaultMessage: 'Remote cluster selection',
            }
          )}
        />
        {areErrorsVisible && Boolean(errorMessage) ? this.renderValidRemoteClusterRequired() : null}
        {errorMessage}

        <EuiSpacer size="s" />
        <div>
          {' '}
          {/* Break out of EuiFormRow's flexbox layout */}
          <EuiButtonEmpty
            href={routing.getHrefToRemoteClusters(
              '/add',
              { redirect: `/data/cross_cluster_replication${currentUrl}` },
              true
            )}
            size="s"
            iconType="plusCircle"
            flush="left"
            data-test-subj="addButton"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.remoteClustersFormField.addRemoteClusterButtonLabel"
              defaultMessage="Add remote cluster"
            />
          </EuiButtonEmpty>
        </div>
      </Fragment>
    );
  };

  renderNoClusterFound = () => {
    const { currentUrl } = this.props;
    const title = i18n.translate(
      'xpack.crossClusterReplication.remoteClustersFormField.emptyRemoteClustersCallOutTitle',
      {
        defaultMessage: `You don't have any remote clusters`,
      }
    );

    return (
      <Fragment>
        <KbnDangerCallout
          title={title}
          data-test-subj="noClusterFoundError"
          text={this.errorMessages.noClusterFound()}
          actionProps={{
            primary: {
              href: routing.getHrefToRemoteClusters(
                '/add',
                { redirect: `/data/cross_cluster_replication${currentUrl}` },
                true
              ),
              iconType: 'plusCircle',
              'data-test-subj': 'addButton',
              children: (
                <FormattedMessage
                  id="xpack.crossClusterReplication.remoteClustersFormField.addRemoteClusterButtonLabel"
                  defaultMessage="Add remote cluster"
                />
              ),
            },
          }}
        />
      </Fragment>
    );
  };

  renderCurrentRemoteClusterNotConnected = (name: string, fatal?: boolean) => {
    const { isEditable, currentUrl } = this.props;
    const { remoteClusterNotConnectedEditable, remoteClusterNotConnectedNotEditable } =
      this.errorMessages;

    const resolver = isEditable
      ? remoteClusterNotConnectedEditable
      : remoteClusterNotConnectedNotEditable;
    if (!resolver) {
      return null;
    }
    const { title, description } = resolver(name);

    const CalloutComponent = fatal ? KbnDangerCallout : KbnWarningCallout;

    return (
      <CalloutComponent
        title={title}
        data-test-subj="notConnectedError"
        text={description}
        actionProps={{
          primary: {
            href: routing.getHrefToRemoteClusters(
              `/edit/${name}`,
              { redirect: `/data/cross_cluster_replication${currentUrl}` },
              true
            ),
            'data-test-subj': 'editButton',
            children: (
              <FormattedMessage
                id="xpack.crossClusterReplication.remoteClustersFormField.viewRemoteClusterButtonLabel"
                defaultMessage="Edit remote cluster"
              />
            ),
          },
        }}
      />
    );
  };

  renderRemoteClusterDoesNotExist = (name: string) => {
    const { currentUrl } = this.props;
    const title = i18n.translate(
      'xpack.crossClusterReplication.remoteClustersFormField.remoteClusterNotFoundTitle',
      {
        defaultMessage: `Couldn't find remote cluster ''{name}''`,
        values: { name },
      }
    );

    return (
      <KbnDangerCallout
        title={title}
        text={this.errorMessages.remoteClusterDoesNotExist?.(name)}
        actionProps={{
          primary: {
            href: routing.getHrefToRemoteClusters(
              `/add`,
              { redirect: `/data/cross_cluster_replication${currentUrl}` },
              true
            ),
            iconType: 'plusCircle',
            'data-test-subj': 'addButton',
            children: (
              <FormattedMessage
                id="xpack.crossClusterReplication.remoteClustersFormField.addRemoteClusterButtonLabel"
                defaultMessage="Add remote cluster"
              />
            ),
          },
        }}
      />
    );
  };

  renderErrorMessage = () => {
    const { selected, remoteClusters, isEditable } = this.props;
    const remoteCluster = remoteClusters.find((c) => c.name === selected);
    const isSelectedRemoteClusterConnected = remoteCluster && remoteCluster.isConnected;
    let error;

    if (isEditable) {
      /* Create */
      const hasClusters = Boolean(remoteClusters.length);
      if (hasClusters && selected != null && !isSelectedRemoteClusterConnected) {
        error = this.renderCurrentRemoteClusterNotConnected(selected);
      } else if (!hasClusters) {
        error = this.renderNoClusterFound();
      }
    } else {
      /* Edit */
      const doesExists = !!remoteCluster;
      if (!doesExists && selected != null) {
        error = this.renderRemoteClusterDoesNotExist(selected);
      } else if (doesExists && !isSelectedRemoteClusterConnected && selected != null) {
        error = this.renderCurrentRemoteClusterNotConnected(selected, true);
      }
    }

    return error ? (
      <Fragment>
        <EuiSpacer size="s" />
        {error}
      </Fragment>
    ) : null;
  };

  render() {
    const { remoteClusters, selected, isEditable, areErrorsVisible } = this.props;
    const remoteCluster = remoteClusters.find((c) => c.name === selected);
    const hasClusters = Boolean(remoteClusters.length);
    const isSelectedRemoteClusterConnected = remoteCluster && remoteCluster.isConnected;
    const isInvalid = areErrorsVisible && (!hasClusters || !isSelectedRemoteClusterConnected);
    let field: ReactNode;

    if (isEditable) {
      if (hasClusters) {
        field = this.renderDropdown();
      } else {
        field = this.renderErrorMessage();
      }
    } else {
      field = this.renderNotEditable();
    }

    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.crossClusterReplication.remoteClustersFormField.fieldClusterLabel"
            defaultMessage="Remote cluster"
          />
        }
        isInvalid={isInvalid}
        fullWidth
        data-test-subj="remoteClusterFormField"
      >
        <>{field}</>
      </EuiFormRow>
    );
  }
}
