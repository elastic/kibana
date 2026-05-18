/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface SavedSearch {
  id: string;
  title: string;
  updatedAt: string;
}

interface RecentSearchesWidgetProps {
  searches: SavedSearch[];
}

const relativeTime = (isoDate: string): string => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const RecentSearchesWidget: React.FC<RecentSearchesWidgetProps> = ({ searches }) => {
  return (
    <EuiPanel hasBorder style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="discoverApp" size="m" color="accent" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Recent Searches</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      {searches.length === 0 ? (
        <EuiEmptyPrompt
          iconType="discoverApp"
          title={<h3>No saved searches yet</h3>}
          body={<p>Save a search in Discover to see it here.</p>}
          titleSize="xs"
        />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {searches.map((s) => (
            <EuiFlexItem key={s.id}>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiLink href={`/app/discover#/?savedSearchId=${s.id}`} target="_self">
                    <EuiText size="s">
                      <p>{s.title}</p>
                    </EuiText>
                  </EuiLink>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>{relativeTime(s.updatedAt)}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
