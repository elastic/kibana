/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { NoNews } from './no_news';
import { NEWS_FEED_TITLE } from '../../pages/overview/translations';
import { Post } from './post';
import { SidebarHeader } from '../sidebar_header';
import { NewsItem } from './types';

interface Props {
  news: NewsItem[] | null | undefined;
}

export const NewsFeed = React.memo<Props>(({ news }) => {
  if (news == null) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (news.length === 0) {
    return <NoNews />;
  }

  return (
    <>
      <SidebarHeader title={NEWS_FEED_TITLE} />
      {news.map((n: NewsItem) => (
        <React.Fragment key={n.hash}>
          <Post newsItem={n} />
          <EuiSpacer size="l" />
        </React.Fragment>
      ))}
    </>
  );
});

NewsFeed.displayName = 'NewsFeed';
