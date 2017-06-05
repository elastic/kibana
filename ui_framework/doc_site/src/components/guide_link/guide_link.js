import React from 'react';

export const GuideLink = props => (
  <a
    href={props.href}
    target={props.target}
    className="guideLink"
  >
    {props.children}
  </a>
);
