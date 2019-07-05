/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import copy from 'copy-to-clipboard';
import PropTypes from 'prop-types';
import React, { MouseEvent, KeyboardEvent, ReactElement } from 'react';

interface Props {
  children: ReactElement<any>;
  content: string | number;
  onCopy: (result: boolean) => void;
}

export class Clipboard extends React.PureComponent<Props> {
  public static propTypes = {
    children: PropTypes.element.isRequired,
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onCopy: PropTypes.func,
  };

  public render() {
    return (
      <div
        className="canvasClipboard"
        onClick={this.onClick}
        onKeyPress={this.onClick}
        role="button"
        tabIndex={0}
      >
        {this.props.children}
      </div>
    );
  }

  private onClick = (ev: MouseEvent<HTMLDivElement> | KeyboardEvent) => {
    const { content, onCopy } = this.props;
    ev.preventDefault();
    onCopy(copy(content.toString(), { debug: true }));
  };
}
