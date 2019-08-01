/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiTitle,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiCodeEditor,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { serializeTemplate } from '../../../../../common/lib/template_serialization';
import { StepProps } from '../types';

const NoneDescriptionText = () => (
  <FormattedMessage
    id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.noneDescriptionText"
    defaultMessage="None"
  />
);

const getDescriptionText = (data: any) => {
  const hasEntries = data && Object.entries(data).length > 0;

  return hasEntries ? (
    <FormattedMessage
      id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.yesDescriptionText"
      defaultMessage="Yes"
    />
  ) : (
    <FormattedMessage
      id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.noDescriptionText"
      defaultMessage="No"
    />
  );
};

export const StepReview: React.FunctionComponent<StepProps> = ({ template, updateCurrentStep }) => {
  const { name, indexPatterns, version, order } = template;

  const serializedTemplate = serializeTemplate(template);
  const {
    mappings: serializedMappings,
    settings: serializedSettings,
    aliases: serializedAliases,
  } = serializedTemplate;

  const numIndexPatterns = indexPatterns.length;

  const hasWildCardIndexPattern = Boolean(indexPatterns.find(pattern => pattern === '*'));

  const SummaryTab = () => (
    <Fragment>
      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.indexPatternsLabel"
                defaultMessage="Index {numIndexPatterns, plural, one {pattern} other {patterns}}"
                values={{ numIndexPatterns }}
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {numIndexPatterns > 1 ? (
                <EuiText>
                  <ul>
                    {indexPatterns.map((indexName: string, i: number) => {
                      return (
                        <li key={`${indexName}-${i}`}>
                          <EuiTitle size="xs">
                            <span>{indexName}</span>
                          </EuiTitle>
                        </li>
                      );
                    })}
                  </ul>
                </EuiText>
              ) : (
                indexPatterns.toString()
              )}
            </EuiDescriptionListDescription>

            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.orderLabel"
                defaultMessage="Order"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {order !== '' ? order : <NoneDescriptionText />}
            </EuiDescriptionListDescription>

            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.versionLabel"
                defaultMessage="Version"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {version !== '' ? version : <NoneDescriptionText />}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.settingsLabel"
                defaultMessage="Has index settings"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {getDescriptionText(serializedSettings)}
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.mappingLabel"
                defaultMessage="Has mappings"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {getDescriptionText(serializedMappings)}
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.aliasesLabel"
                defaultMessage="Has aliases"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {getDescriptionText(serializedAliases)}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );

  const JsonTab = () => (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiCodeEditor
        mode="json"
        theme="textmate"
        isReadOnly
        setOptions={{ maxLines: Infinity }}
        value={JSON.stringify(serializedTemplate, null, 2)}
        editorProps={{ $blockScrolling: Infinity }}
        aria-label={
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepReview.jsonTab.jsonAriaLabel"
            defaultMessage="Index templates payload"
          />
        }
      />
    </Fragment>
  );

  return (
    <div data-test-subj="stepSummary">
      <EuiTitle>
        <h3>
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepReview.stepTitle"
            defaultMessage="Review details for '{templateName}'"
            values={{ templateName: name }}
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="l" />

      {hasWildCardIndexPattern ? (
        <Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.indexPatternsWarningTitle"
                defaultMessage="Proceed with caution"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.indexPatternsWarningDescription"
                defaultMessage="This template contains a wildcard (*) as an index pattern. This will create a catch-all template and apply to all indices."
              />{' '}
              {/* Edit link navigates back to step 1 (logistics) */}
              <EuiLink onClick={updateCurrentStep.bind(null, 1)}>
                <FormattedMessage
                  id="xpack.idxMgmt.templatesForm.stepReview.summaryTab.indexPatternsWarningLinkText"
                  defaultMessage="Edit template."
                />
              </EuiLink>
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </Fragment>
      ) : null}

      <EuiTabbedContent
        tabs={[
          {
            id: 'summary',
            name: i18n.translate('xpack.idxMgmt.templatesForm.stepReview.summaryTabTitle', {
              defaultMessage: 'Summary',
            }),
            content: <SummaryTab />,
          },
          {
            id: 'json',
            name: i18n.translate('xpack.idxMgmt.templatesForm.stepReview.jsonTabTitle', {
              defaultMessage: 'JSON',
            }),
            content: <JsonTab />,
          },
        ]}
      />
    </div>
  );
};
