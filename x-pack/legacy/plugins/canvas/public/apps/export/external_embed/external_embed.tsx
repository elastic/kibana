/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export interface Props {
  workpad: object;
}

export class ExternalEmbed extends React.PureComponent<Props> {
  static propTypes = {};

  render() {
    const { workpad } = this.props;

    return (
      <div className="canvasExternalEmbed">
        <pre>{JSON.stringify(workpad, null, 2)}</pre>
      </div>
    );
  }
}
