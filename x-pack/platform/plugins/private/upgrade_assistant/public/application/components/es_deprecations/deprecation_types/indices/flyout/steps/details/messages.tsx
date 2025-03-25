/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiLink, EuiSpacer, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ReindexStatus } from '../../../../../../../../../common/types';
import { IndexClosedParagraph } from '../index_closed_paragraph';

export const getReindexButtonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.fetchFailed:
    case ReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case ReindexStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.reindexingLabel"
          defaultMessage="Reindexing…"
        />
      );
    case ReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.restartLabel"
          defaultMessage="Restart reindexing"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.runReindexLabel"
          defaultMessage="Start reindexing"
        />
      );
  }
};

const RecommendedOptionBadge = () => (
  <EuiBadge color="hollow">
    <FormattedMessage
      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.recommendedOption"
      defaultMessage="Recommended"
    />
  </EuiBadge>
);

export const getDefaultGuideanceText = ({
  isClosedIndex,
  readOnlyExcluded,
  reindexExcluded,
  indexBlockUrl,
  indexManagementUrl,
  isLargeIndex,
}: {
  isClosedIndex: boolean;
  readOnlyExcluded: boolean;
  reindexExcluded: boolean;
  indexBlockUrl: string;
  indexManagementUrl: string;
  isLargeIndex?: boolean;
}) => {
  const guideanceListItems = [];
  if (!reindexExcluded) {
    guideanceListItems.push({
      title: (
        <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option1.title"
              defaultMessage="Option {optionCount}: Reindex data"
              values={{ optionCount: guideanceListItems.length + 1 }}
            />
          </EuiFlexItem>
          {!isLargeIndex && !readOnlyExcluded && (
            <EuiFlexItem grow={false}>
              <RecommendedOptionBadge />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
      description: (
        <EuiText size="m">
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option1.description"
            defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
          />
          {isClosedIndex && (
            <Fragment>
              <EuiSpacer size="xs" />
              <IndexClosedParagraph />
            </Fragment>
          )}
        </EuiText>
      ),
    });
  }

  if (!readOnlyExcluded) {
    guideanceListItems.push({
      title: (
        <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.title"
              defaultMessage="Option {optionCount}: Mark as read-only"
              values={{ optionCount: guideanceListItems.length + 1 }}
            />
          </EuiFlexItem>
          {(isLargeIndex || reindexExcluded) && (
            <EuiFlexItem grow={false}>
              <RecommendedOptionBadge />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
      description: (
        <EuiText size="m">
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option2.description"
            defaultMessage="Old indices can maintain compatibility with the next major version if they are turned into read-only mode. If you no longer need to update documents in this index (or add new ones), you might want to convert it to a read-only index. {docsLink}"
            values={{
              docsLink: (
                <EuiLink target="_blank" href={indexBlockUrl}>
                  {i18n.translate(
                    'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.learnMoreLinkLabel',
                    {
                      defaultMessage: 'Learn more',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      ),
    });
  }

  guideanceListItems.push({
    title: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option3.title',
      {
        defaultMessage: 'Option {optionCount}: Delete index',
        values: { optionCount: guideanceListItems.length + 1 },
      }
    ),
    description: (
      <EuiText size="m">
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option3.description"
          defaultMessage="If you no longer need it, you can also delete the index from {indexManagementLinkHtml}."
          values={{
            indexManagementLinkHtml: (
              <EuiLink href={indexManagementUrl}>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.indexMgmtLink"
                  defaultMessage="Index Management"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    ),
  });

  return guideanceListItems;
};
