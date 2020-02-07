/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface HelpCenterContentProps {
  feedbackLink: string;
  appName: string;
}

export const HelpCenterContent: React.FC<HelpCenterContentProps> = ({ feedbackLink, appName }) => {
  const chrome = useKibana().services.chrome;

  useEffect(() => {
    return chrome?.setHelpExtension({
      appName,
      links: [
        {
          linkType: 'discuss',
          href: feedbackLink,
        },
      ],
    });
  }, [feedbackLink, appName, chrome]);

  return null;
};
