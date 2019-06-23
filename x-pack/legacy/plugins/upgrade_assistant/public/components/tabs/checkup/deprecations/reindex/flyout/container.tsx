/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlyout, EuiFlyoutHeader, EuiPortal, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ReindexState } from '../polling_service';
import { ChecklistFlyoutStep } from './checklist_step';
import { WarningsFlyoutStep } from './warnings_step';

enum ReindexFlyoutStep {
  reindexWarnings,
  checklist,
}

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
}

interface ReindexFlyoutState {
  currentFlyoutStep: ReindexFlyoutStep;
}

/**
 * Wrapper for the contents of the flyout that manages which step of the flyout to show.
 */
export class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    const { status, reindexWarnings } = props.reindexState;

    this.state = {
      // If there are any warnings and we haven't started reindexing, show the warnings step first.
      currentFlyoutStep:
        reindexWarnings && reindexWarnings.length > 0 && status === undefined
          ? ReindexFlyoutStep.reindexWarnings
          : ReindexFlyoutStep.checklist,
    };
  }

  public render() {
    const { closeFlyout, indexName, reindexState, startReindex, cancelReindex } = this.props;
    const { currentFlyoutStep } = this.state;

    let flyoutContents: React.ReactNode;
    switch (currentFlyoutStep) {
      case ReindexFlyoutStep.reindexWarnings:
        flyoutContents = (
          <WarningsFlyoutStep
            closeFlyout={closeFlyout}
            warnings={reindexState.reindexWarnings!}
            advanceNextStep={this.advanceNextStep}
          />
        );
        break;
      case ReindexFlyoutStep.checklist:
        flyoutContents = (
          <ChecklistFlyoutStep
            closeFlyout={closeFlyout}
            reindexState={reindexState}
            startReindex={startReindex}
            cancelReindex={cancelReindex}
          />
        );
        break;
      default:
        throw new Error(`Invalid flyout step: ${currentFlyoutStep}`);
    }

    return (
      <EuiPortal>
        <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="m" maxWidth>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.flyoutHeader"
                  defaultMessage="Reindex {indexName}"
                  values={{ indexName }}
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          {flyoutContents}
        </EuiFlyout>
      </EuiPortal>
    );
  }

  public advanceNextStep = () => {
    this.setState({ currentFlyoutStep: ReindexFlyoutStep.checklist });
  };
}
