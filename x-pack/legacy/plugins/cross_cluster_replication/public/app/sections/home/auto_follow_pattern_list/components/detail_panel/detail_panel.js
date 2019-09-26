/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { getIndexListUri } from '../../../../../../../../index_management/public/services/navigation';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import {
  AutoFollowPatternIndicesPreview,
  AutoFollowPatternDeleteProvider,
} from '../../../../../components';

import routing from '../../../../../services/routing';

export class DetailPanel extends Component {
  static propTypes = {
    apiStatus: PropTypes.string,
    autoFollowPatternId: PropTypes.string,
    autoFollowPattern: PropTypes.object,
    closeDetailPanel: PropTypes.func.isRequired,
  }

  renderAutoFollowPattern({ followIndexPatternPrefix, followIndexPatternSuffix, remoteCluster, leaderIndexPatterns }) {
    return (
      <section
        aria-labelledby="ccrAutoFollowPatternDetailSettingsTitle"
        data-test-subj="settingsSection"
      >
        <EuiTitle size="s">
          <h3 id="ccrAutoFollowPatternDetailSettingsTitle">
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.statusTitle"
              defaultMessage="Settings"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiDescriptionList data-test-subj="settingsValues">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.remoteClusterLabel"
                    defaultMessage="Remote cluster"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="remoteCluster">
                {remoteCluster}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.leaderPatternsLabel"
                    defaultMessage="Leader patterns"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="leaderIndexPatterns">
                {leaderIndexPatterns.join(', ')}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.prefixLabel"
                    defaultMessage="Prefix"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="patternPrefix">
                {followIndexPatternPrefix || (
                  <em>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.prefixEmptyValue"
                      defaultMessage="No prefix"
                    />
                  </em>
                )}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.suffixLabel"
                    defaultMessage="Suffix"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="patternSuffix">
                {followIndexPatternSuffix || (
                  <em>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.suffixEmptyValue"
                      defaultMessage="No suffix"
                    />
                  </em>
                )}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>
      </section>
    );
  }

  renderIndicesPreview(prefix, suffix, leaderIndexPatterns) {
    return (
      <section data-test-subj="indicesPreviewSection">
        <AutoFollowPatternIndicesPreview
          prefix={prefix}
          suffix={suffix}
          leaderIndexPatterns={leaderIndexPatterns}
        />
      </section>
    );
  }

  renderAutoFollowPatternNotFound() {
    return (
      <EuiFlyoutBody>
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="alert" color="danger" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.notFoundLabel"
                  defaultMessage="Auto-follow pattern not found"
                />
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    );
  }

  renderAutoFollowPatternErrors(autoFollowPattern) {
    if (!autoFollowPattern.errors.length) {
      return null;
    }

    return (
      <section data-test-subj="errors">
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiTitle size="s" data-test-subj="titleErrors">
              <h3>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.recentErrorsTitle"
                  defaultMessage="Recent errors"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText>
          <ul>
            {autoFollowPattern.errors.map((error, i) => (
              <li
                key={i}
                data-test-subj="recentError"
              >
                {error.autoFollowException.reason}
              </li>
            ))}
          </ul>
        </EuiText>
      </section>
    );
  }

  renderFlyoutBody() {
    const { autoFollowPattern } = this.props;

    if (!autoFollowPattern) {
      return this.renderAutoFollowPatternNotFound();
    }

    const {
      followIndexPatternPrefix,
      followIndexPatternSuffix,
      leaderIndexPatterns,
    } = autoFollowPattern;

    let indexManagementFilter;

    if(followIndexPatternPrefix) {
      indexManagementFilter = `name:${followIndexPatternPrefix}`;
    } else if(followIndexPatternSuffix) {
      indexManagementFilter = `name:${followIndexPatternSuffix}`;
    }

    const indexManagementUri = getIndexListUri(indexManagementFilter);

    return (
      <EuiFlyoutBody>
        {this.renderAutoFollowPattern(autoFollowPattern)}

        <EuiSpacer size="m" />

        {this.renderIndicesPreview(followIndexPatternPrefix, followIndexPatternSuffix, leaderIndexPatterns)}

        <EuiSpacer size="l" />

        <EuiLink
          href={indexManagementUri}
          data-test-subj="viewIndexManagementLink"
        >
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.viewIndicesLink"
            defaultMessage="View your follower indices in Index Management"
          />
        </EuiLink>

        <EuiSpacer size="l" />

        {this.renderAutoFollowPatternErrors(autoFollowPattern)}

      </EuiFlyoutBody>
    );
  }

  renderFlyoutFooter() {
    const {
      autoFollowPattern,
      closeDetailPanel,
    } = this.props;

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={closeDetailPanel}
              data-test-subj="closeFlyoutButton"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          {autoFollowPattern && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <AutoFollowPatternDeleteProvider>
                    {(deleteAutoFollowPattern) => (
                      <EuiButtonEmpty
                        color="danger"
                        onClick={() => deleteAutoFollowPattern(autoFollowPattern.name)}
                        data-test-subj="deleteButton"
                      >
                        <FormattedMessage
                          id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.deleteButtonLabel"
                          defaultMessage="Delete"
                        />
                      </EuiButtonEmpty>
                    )}
                  </AutoFollowPatternDeleteProvider>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="primary"
                    href={routing.getAutoFollowPatternPath(autoFollowPattern.name)}
                    data-test-subj="editButton"
                  >
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.editButtonLabel"
                      defaultMessage="Edit"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  render() {
    const { autoFollowPatternId, closeDetailPanel } = this.props;

    return (
      <EuiFlyout
        data-test-subj="autoFollowPatternDetail"
        onClose={closeDetailPanel}
        aria-labelledby="autoFollowPatternDetailsFlyoutTitle"
        size="m"
        maxWidth={400}
      >
        <EuiFlyoutHeader>
          <EuiTitle
            size="m"
            id="autoFollowPatternDetailsFlyoutTitle"
            data-test-subj="title"
          >
            <h2>{autoFollowPatternId}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {this.renderFlyoutBody()}
        {this.renderFlyoutFooter()}
      </EuiFlyout>
    );
  }
}
