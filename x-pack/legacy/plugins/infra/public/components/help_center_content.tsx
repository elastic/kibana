/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from 'ui/chrome';

interface HelpCenterContentProps {
  feedbackLink: string;
  appName: string;
}

export class HelpCenterContent extends React.Component<HelpCenterContentProps> {
  public componentDidMount = () => {
    chrome.helpExtension.set({
      appName: this.props.appName,
      links: [
        {
          linkType: 'discuss',
          href: this.props.feedbackLink,
        },
      ],
    });
  };

  public render = () => {
    return null;
  };
}
