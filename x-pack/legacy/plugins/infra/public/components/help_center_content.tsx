/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import chrome from 'ui/chrome';

interface HelpCenterContentProps {
  feedbackLink: string;
  appName: string;
}

export const HelpCenterContent: React.FC<HelpCenterContentProps> = ({ feedbackLink, appName }) => {
  useEffect(() => {
    chrome.helpExtension.set({
      appName,
      links: [
        {
          linkType: 'discuss',
          href: feedbackLink,
        },
      ],
    });
  }, [feedbackLink, appName]);

  return null;
};
