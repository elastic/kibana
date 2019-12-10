/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ReindexWarning } from '../../../../../../../../../common/types';

interface CheckedIds {
  [id: string]: boolean;
}

export const idForWarning = (warning: ReindexWarning) => `reindexWarning-${warning}`;

const WarningCheckbox: React.FunctionComponent<{
  checkedIds: CheckedIds;
  warning: ReindexWarning;
  label: React.ReactNode;
  description: React.ReactNode;
  documentationUrl: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ checkedIds, warning, label, onChange, description, documentationUrl }) => (
  <Fragment>
    <EuiText>
      <EuiCheckbox
        id={idForWarning(warning)}
        label={<strong>{label}</strong>}
        checked={checkedIds[idForWarning(warning)]}
        onChange={onChange}
      />
      <p className="upgWarningsStep__warningDescription">
        {description}
        <br />
        <EuiLink href={documentationUrl} target="_blank">
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.documentationLinkLabel"
            defaultMessage="Documentation"
          />
        </EuiLink>
      </p>
    </EuiText>

    <EuiSpacer />
  </Fragment>
);

interface WarningsConfirmationFlyoutProps {
  closeFlyout: () => void;
  warnings: ReindexWarning[];
  advanceNextStep: () => void;
}

interface WarningsConfirmationFlyoutState {
  checkedIds: CheckedIds;
}

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export class WarningsFlyoutStep extends React.Component<
  WarningsConfirmationFlyoutProps,
  WarningsConfirmationFlyoutState
> {
  constructor(props: WarningsConfirmationFlyoutProps) {
    super(props);

    this.state = {
      checkedIds: props.warnings.reduce((checkedIds, warning) => {
        checkedIds[idForWarning(warning)] = false;
        return checkedIds;
      }, {} as { [id: string]: boolean }),
    };
  }

  public render() {
    const { warnings, closeFlyout, advanceNextStep } = this.props;
    const { checkedIds } = this.state;

    // Do not allow to proceed until all checkboxes are checked.
    const blockAdvance = Object.values(checkedIds).filter(v => v).length < warnings.length;

    return (
      <Fragment>
        <EuiFlyoutBody>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.destructiveCallout.calloutTitle"
                defaultMessage="This index requires destructive changes that can't be undone"
              />
            }
            color="danger"
            iconType="alert"
          >
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.destructiveCallout.calloutDetail"
                defaultMessage="Back up your index, then proceed with the reindex by accepting each breaking change."
              />
            </p>
          </EuiCallOut>

          <EuiSpacer />

          {warnings.includes(ReindexWarning.customTypeName) && (
            <WarningCheckbox
              checkedIds={checkedIds}
              onChange={this.onChange}
              warning={ReindexWarning.customTypeName}
              label={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningTitle"
                  defaultMessage="Mapping type will be changed to {defaultType}"
                  values={{
                    defaultType: <EuiCode>_doc</EuiCode>,
                  }}
                />
              }
              description={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningDetail"
                  defaultMessage="Mapping types are no longer supported in 8.x. This index mapping does not use the
                    default type name, {defaultType}, and will be updated when reindexed. Ensure no application code
                    or scripts rely on a different type."
                  values={{
                    defaultType: <EuiCode>_doc</EuiCode>,
                  }}
                />
              }
              documentationUrl="https://www.elastic.co/guide/en/elasticsearch/reference/7.0/removal-of-types.html"
            />
          )}

          {warnings.includes(ReindexWarning.apmReindex) && (
            <WarningCheckbox
              checkedIds={checkedIds}
              onChange={this.onChange}
              warning={ReindexWarning.apmReindex}
              label={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.apmReindexWarningTitle"
                  defaultMessage="This index will be converted to ECS format"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.apmReindexWarningDetail"
                  defaultMessage="Starting in version 7.0.0, APM data will be represented in the Elastic Common Schema.
                      Historical APM data will not visible until it's reindexed."
                />
              }
              documentationUrl="https://www.elastic.co/guide/en/apm/get-started/master/apm-release-notes.html"
            />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill color="danger" onClick={advanceNextStep} disabled={blockAdvance}>
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.continueButtonLabel"
                  defaultMessage="Continue with reindex"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    );
  }

  private onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optionId = e.target.id;
    const nextCheckedIds = {
      ...this.state.checkedIds,
      ...{
        [optionId]: !this.state.checkedIds[optionId],
      },
    };

    this.setState({ checkedIds: nextCheckedIds });
  };
}
