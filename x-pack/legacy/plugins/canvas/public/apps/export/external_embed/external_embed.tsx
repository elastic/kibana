/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export interface Props {
  workpad: object;
  isInFlight: boolean;
  isAppReady: boolean;
}

export class ExternalEmbed extends React.PureComponent<Props> {
  static propTypes = {};

  render() {
    const { workpad, isInFlight } = this.props;

    if (isInFlight) {
      return null;
    }

    const blob = new Blob([JSON.stringify(workpad)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // @ts-ignore Untyped object
    const fileName = workpad.name;

    return (
      <div>
        <a href={url} download={fileName}>
          Download Workpad
        </a>
      </div>
    );
  }
}
