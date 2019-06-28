/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList, EuiGlobalToastListToast as Toast } from '@elastic/eui';
import copy from 'copy-to-clipboard';
import * as React from 'react';
import uuid from 'uuid';

import * as i18n from './translations';

export type OnCopy = (
  { content, isSuccess }: { content: string | number; isSuccess: boolean }
) => void;

interface GetSuccessToastParams {
  titleSummary?: string;
}

const getSuccessToast = ({ titleSummary }: GetSuccessToastParams): Toast => ({
  id: `copy-success-${uuid.v4()}`,
  color: 'success',
  iconType: 'copyClipboard',
  title: `${i18n.COPIED} ${titleSummary} ${i18n.TO_THE_CLIPBOARD}`,
});

interface Props {
  children: JSX.Element;
  content: string | number;
  onCopy?: OnCopy;
  titleSummary?: string;
  toastLifeTimeMs?: number;
}

interface State {
  toasts: Toast[];
}

export class Clipboard extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      toasts: [],
    };
  }

  public render() {
    const { toastLifeTimeMs = 5000 } = this.props;

    // TODO: 1 error is: Visible, non-interactive elements with click handlers must have at least one keyboard listener
    // TODO: 2 error is: Elements with the 'button' interactive role must be focusable
    // TODO: Investigate this error
    /* eslint-disable */
    return (
      <>
        <div role="button" data-test-subj="clipboard" onClick={this.onClick}>
          {this.props.children}
        </div>
        <EuiGlobalToastList
          toasts={this.state.toasts}
          dismissToast={this.removeToast}
          toastLifeTimeMs={toastLifeTimeMs}
        />
      </>
    );
    /* eslint-enable */
  }

  private onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const { content, onCopy, titleSummary } = this.props;

    event.preventDefault();
    event.stopPropagation();

    const isSuccess = copy(`${content}`, { debug: true });

    if (onCopy != null) {
      onCopy({ content, isSuccess });
    }

    if (isSuccess) {
      this.setState(prevState => ({
        toasts: [...prevState.toasts, getSuccessToast({ titleSummary })],
      }));
    }
  };

  private removeToast = (removedToast: Toast): void => {
    this.setState(prevState => ({
      toasts: prevState.toasts.filter(toast => toast.id !== removedToast.id),
    }));
  };
}
