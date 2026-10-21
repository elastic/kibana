/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent, ReactNode } from 'react';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import type { DataSourceType } from '../../common/types';
import { useBoostServices } from '../hooks/use_boost_services';

interface IndexManagementLinkProps {
  type: DataSourceType;
  name: string;
  /** What the link shows, the name by default. */
  children?: ReactNode;
  className?: string;
}

// Modified clicks, such as to open the link in a new tab, are left to the browser.
const isModifiedClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

/**
 * An index or data stream, linking to its details in Index Management: an index's details page, or
 * a data stream's details flyout. Without Index Management, it's plain text.
 */
export const IndexManagementLink = ({
  type,
  name,
  children = name,
  className,
}: IndexManagementLinkProps) => {
  const { share } = useBoostServices();
  const locator = share.url.locators.get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID);
  const params: IndexManagementLocatorParams =
    type === 'data_stream'
      ? { page: 'data_streams_details', dataStreamName: name }
      : { page: 'index_details', indexName: name };
  const href = useLocatorUrl(locator, params, undefined, [type, name]);

  if (!locator) {
    return <span className={className}>{children}</span>;
  }
  return (
    <EuiLink
      // The URL resolves asynchronously, but a click navigates either way, within Kibana.
      href={href || undefined}
      onClick={(event: MouseEvent) => {
        if (href && isModifiedClick(event)) {
          return;
        }
        event.preventDefault();
        locator.navigate(params);
      }}
      className={className}
      data-test-subj="boostIndexManagementLink"
    >
      {children}
    </EuiLink>
  );
};
