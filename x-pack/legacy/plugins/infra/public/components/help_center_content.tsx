/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import chrome from 'ui/chrome';

interface HelpCenterContentProps {
  feedbackLink: string;
  feedbackLinkText: string;
}

const Content: React.FC<HelpCenterContentProps> = ({ feedbackLink, feedbackLinkText }) => (
  <EuiLink href={feedbackLink} target="_blank" rel="noopener">
    {feedbackLinkText}
  </EuiLink>
);

export const HelpCenterContent: React.FC<HelpCenterContentProps> = ({
  feedbackLink,
  feedbackLinkText,
}) => {
  useEffect(() => {
    chrome.helpExtension.set(domElement => {
      ReactDOM.render(
        <Content feedbackLink={feedbackLink} feedbackLinkText={feedbackLinkText} />,
        domElement
      );
      return () => {
        ReactDOM.unmountComponentAtNode(domElement);
      };
    });
  }, [feedbackLink, feedbackLinkText]);

  return null;
};
