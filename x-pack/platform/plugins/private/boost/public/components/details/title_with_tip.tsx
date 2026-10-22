/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';

/**
 * A title followed inline by an icon whose tooltip explains it. A line can break beside an inline
 * icon even after a no-break space, so the title's last word and the icon are kept on one line,
 * and a title that wraps takes the icon with it. Without a color, the icon takes the title's.
 */
export const TitleWithTip = ({ title, tip }: { title: string; tip: string }) => {
  const lastWordStart = title.lastIndexOf(' ') + 1;
  return (
    <>
      {title.slice(0, lastWordStart)}
      <span css={{ whiteSpace: 'nowrap' }}>
        {title.slice(lastWordStart)}
        {' '}
        <EuiIconTip type="info" content={tip} aria-label={title} />
      </span>
    </>
  );
};
