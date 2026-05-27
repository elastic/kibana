/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';

interface FavoriteDashboard {
  id: string;
  title: string;
}

interface SavedObjectsResponse {
  saved_objects: Array<{
    id: string;
    attributes: { title?: string };
    error?: { message: string };
  }>;
}

interface FavoritesWidgetProps {
  http: HttpStart;
}

export const FavoritesWidget: React.FC<FavoritesWidgetProps> = ({ http }) => {
  const { euiTheme } = useEuiTheme();
  const [favorites, setFavorites] = useState<FavoriteDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    http
      .get<{ favoriteIds: string[] }>('/internal/content_management/favorites/dashboard')
      .then(async ({ favoriteIds }) => {
        if (!favoriteIds.length) return;
        const bulk = await http.post<SavedObjectsResponse>('/api/saved_objects/_bulk_get', {
          body: JSON.stringify(favoriteIds.map((id) => ({ type: 'dashboard', id }))),
        });
        setFavorites(
          bulk.saved_objects
            .filter((so) => !so.error)
            .map((so) => ({ id: so.id, title: so.attributes.title ?? 'Untitled' }))
        );
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [http]);

  const rowStyle = css`
    padding: ${euiTheme.size.s} 0;
    border-bottom: 1px solid ${euiTheme.colors.lightShade};
    &:last-child {
      border-bottom: none;
    }
  `;

  return (
    <EuiPanel hasBorder paddingSize="m" style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="starFilled" size="m" color="warning" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Favorites</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {!isLoading && favorites.length === 0 ? (
        <EuiEmptyPrompt
          icon={<EuiIcon type="starEmpty" size="l" color="subdued" />}
          title={<h4>No favorites yet</h4>}
          titleSize="xs"
          body={
            <EuiText size="s" color="subdued">
              <p>Star a dashboard to pin it here for quick access.</p>
            </EuiText>
          }
        />
      ) : (
        favorites.map((fav) => (
          <div key={fav.id} css={rowStyle}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="dashboardApp" size="s" color="primary" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink
                  href={http.basePath.prepend(`/app/dashboards#/view/${fav.id}`)}
                  target="_self"
                >
                  <EuiText size="s">
                    <span>{fav.title}</span>
                  </EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ))
      )}
    </EuiPanel>
  );
};
