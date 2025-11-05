/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
  EuiCode,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { METRIC_TYPE } from '@kbn/analytics';
import { useAppContext } from '../../../app_context';
import { DiscoverExternalLinks } from './external_links';
import { DeprecationsCountCallout, ResetCounterButton } from './deprecations_count_checkpoint';
import { useDeprecationLogging } from './use_deprecation_logging';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';
import { loadLogsCheckpoint, saveLogsCheckpoint } from '../../../lib/logs_checkpoint';
import { DEPRECATION_LOGS_INDEX } from '../../../../../common/constants';
import { WithPrivileges, MissingPrivileges } from '../../../../shared_imports';
import { uiMetricService, UIM_ES_DEPRECATION_LOGS_PAGE_LOAD } from '../../../lib/ui_metric';

const i18nTexts = {
  analyzeTitle: i18n.translate('xpack.upgradeAssistant.overview.analyzeTitle', {
    defaultMessage: 'Analyze deprecation logs',
  }),
  apiCompatibilityNoteTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.apiCompatibilityNoteTitle',
    {
      defaultMessage: 'Apply API compatibility headers (optional)',
    }
  ),
  apiCompatibilityNoteBody: (docLink: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.apiCompatibilityNoteBody"
      defaultMessage="We recommend you resolve all deprecation issues before upgrading. If needed, you can apply API compatibility headers to requests that use deprecated features. {learnMoreLink}."
      values={{
        learnMoreLink: (
          <EuiLink href={docLink} target="_blank">
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.apiCompatibilityNoteLink"
              defaultMessage="Learn more"
            />
          </EuiLink>
        ),
      }}
    />
  ),
  onlyLogWritingEnabledTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deprecationWarningTitle',
    {
      defaultMessage: 'Your logs are being written to the logs directory',
    }
  ),
  onlyLogWritingEnabledBody: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deprecationWarningBody',
    {
      defaultMessage:
        'Go to your logs directory to view the deprecation logs or enable deprecation log collection to see them in Kibana.',
    }
  ),
  deniedPrivilegeTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deniedPrivilegeTitle',
    {
      defaultMessage: 'You need index privileges to analyze the deprecation logs',
    }
  ),
  deniedPrivilegeDescription: (privilegesMissing: MissingPrivileges) => (
    // NOTE: hardcoding the missing privilege because the WithPrivileges HOC
    // doesnt provide a way to retrieve which specific privileges an index
    // is missing.
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.deprecationLogs.deniedPrivilegeDescription"
      defaultMessage="The deprecation logs will continue to be indexed, but you won't be able to analyze them until you have the read index {privilegesCount, plural, one {privilege} other {privileges}} for: {missingPrivileges}"
      values={{
        missingPrivileges: (
          <EuiCode transparentBackground={true}>{privilegesMissing?.index?.join(', ')}</EuiCode>
        ),
        privilegesCount: privilegesMissing?.index?.length,
      }}
    />
  ),
  reviewDeprecationLogsInfo: (docLink: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.esDeprecationLogs.reviewDeprecationLogsInfo"
      defaultMessage="Review the deprecation logs to determine if your applications are using any deprecated APIs. Update your applications to prevent errors or changes in behavior after you upgrade. {learnMoreLink}."
      values={{
        learnMoreLink: (
          <EuiLink href={docLink} target="_blank" data-test-subj="documentationLink">
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.apiCompatibilityNoteLink"
              defaultMessage="Learn more"
            />
          </EuiLink>
        ),
      }}
    />
  ),
};

const callOut = (
  hasPrivileges: boolean,
  privilegesMissing: MissingPrivileges,
  onlyDeprecationLogWritingEnabled: boolean,
  isDeprecationLogIndexingEnabled: boolean,
  checkpoint: string
) => {
  if (onlyDeprecationLogWritingEnabled) {
    return (
      <EuiCallOut
        title={i18nTexts.onlyLogWritingEnabledTitle}
        color="warning"
        iconType="question"
        data-test-subj="deprecationWarningCallout"
      >
        <p>{i18nTexts.onlyLogWritingEnabledBody}</p>
      </EuiCallOut>
    );
  }

  if (!hasPrivileges && isDeprecationLogIndexingEnabled) {
    return (
      <EuiCallOut
        iconType="question"
        color="warning"
        title={i18nTexts.deniedPrivilegeTitle}
        data-test-subj="noIndexPermissionsCallout"
      >
        <p>{i18nTexts.deniedPrivilegeDescription(privilegesMissing)}</p>
      </EuiCallOut>
    );
  }

  if (hasPrivileges && isDeprecationLogIndexingEnabled) {
    return <DeprecationsCountCallout checkpoint={checkpoint} />;
  }
};

export interface EsDeprecationLogsFlyoutProps {
  closeFlyout: () => void;
  handleToggleChange: () => void;
}

export const EsDeprecationLogsFlyout = ({
  closeFlyout,
  handleToggleChange,
}: EsDeprecationLogsFlyoutProps) => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();

  const {
    isDeprecationLogIndexingEnabled,
    onlyDeprecationLogWritingEnabled,
    isLoading,
    isUpdating,
    fetchError,
    updateError,
    resendRequest,
    toggleLogging,
  } = useDeprecationLogging();
  const [checkpoint, setCheckpoint] = useState(loadLogsCheckpoint());

  useEffect(() => {
    handleToggleChange();
  }, [handleToggleChange, toggleLogging]);

  useEffect(() => {
    saveLogsCheckpoint(checkpoint);
  }, [checkpoint]);

  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.LOADED, UIM_ES_DEPRECATION_LOGS_PAGE_LOAD);
  }, []);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="esDeprecationLogsFlyoutTitle">
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecationLogs.pageTitle"
              defaultMessage="Elasticsearch deprecation logs"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </EuiFlyoutHeader>
      <WithPrivileges privileges={`index.${DEPRECATION_LOGS_INDEX}`}>
        {({ hasPrivileges, privilegesMissing }) => (
          <EuiFlyoutBody
            banner={callOut(
              hasPrivileges,
              privilegesMissing,
              onlyDeprecationLogWritingEnabled,
              isDeprecationLogIndexingEnabled,
              checkpoint
            )}
          >
            <EuiText>
              <p data-test-subj="deprecationLogsDescription">
                {i18nTexts.reviewDeprecationLogsInfo(
                  docLinks.links.elasticsearch.migrationApiDeprecation
                )}
              </p>
            </EuiText>

            <EuiSpacer size="xl" />

            <DeprecationLoggingToggle
              isDeprecationLogIndexingEnabled={isDeprecationLogIndexingEnabled}
              isLoading={isLoading}
              isUpdating={isUpdating}
              fetchError={fetchError}
              updateError={updateError}
              resendRequest={resendRequest}
              toggleLogging={toggleLogging}
            />

            {hasPrivileges && isDeprecationLogIndexingEnabled && (
              <>
                <EuiSpacer size="xl" />
                <EuiText data-test-subj="externalLinksTitle">
                  <h4>{i18nTexts.analyzeTitle}</h4>
                </EuiText>
                <EuiSpacer size="m" />
                <DiscoverExternalLinks
                  checkpoint={checkpoint}
                  showInfoParagraph={true}
                  isButtonFormat={false}
                />

                <EuiSpacer size="xl" />
                <EuiText data-test-subj="apiCompatibilityNoteTitle">
                  <h4>{i18nTexts.apiCompatibilityNoteTitle}</h4>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiText>
                  <p>
                    {i18nTexts.apiCompatibilityNoteBody(
                      docLinks.links.elasticsearch.apiCompatibilityHeader
                    )}
                  </p>
                </EuiText>
              </>
            )}
          </EuiFlyoutBody>
        )}
      </WithPrivileges>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={closeFlyout}
              flush="left"
              data-test-subj="closeEsDeprecationLogs"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecationLogs.closeFlyout"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <WithPrivileges privileges={`index.${DEPRECATION_LOGS_INDEX}`}>
              {({ hasPrivileges }) => (
                <>
                  {hasPrivileges && isDeprecationLogIndexingEnabled && (
                    <ResetCounterButton setCheckpoint={setCheckpoint} />
                  )}
                </>
              )}
            </WithPrivileges>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
