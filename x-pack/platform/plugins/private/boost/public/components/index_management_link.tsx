/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent, ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { EuiLink } from '@elastic/eui';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import type { DataSourceType } from '../../common/types';
import { useBoostServices } from '../hooks/use_boost_services';
import { useRefetchBoostState } from '../hooks/use_boost_state';
import { isModifiedClick } from './is_modified_click';

interface IndexManagementLinkProps {
  type: DataSourceType;
  name: string;
  /** What the link shows, the name by default. */
  children?: ReactNode;
  className?: string;
}

/**
 * An index or data stream, linking to its details in Index Management. An index's details are a
 * page there, and a data stream's a flyout, which opens in place. Without Index Management, it's
 * plain text.
 */
export const IndexManagementLink = ({
  type,
  name,
  children = name,
  className,
}: IndexManagementLinkProps) => {
  const { appParams, indexManagement, share } = useBoostServices();
  const refetchBoostState = useRefetchBoostState();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const locator = share.url.locators.get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID);
  const history = appParams?.history;
  // Created once, since each call returns a new component, which would remount the flyout. Outside
  // the boost app, such as within Index Management, a data stream's details open there instead.
  const DataStreamFlyout = useMemo(
    () =>
      type === 'data_stream' && history
        ? indexManagement?.getDatastreamFlyoutComponent({ history })
        : undefined,
    [type, indexManagement, history]
  );
  const params: IndexManagementLocatorParams =
    type === 'data_stream'
      ? { page: 'data_streams_details', dataStreamName: name }
      : { page: 'index_details', indexName: name };
  const href = useLocatorUrl(locator, params, undefined, [type, name]);

  if (!locator) {
    return <span className={className}>{children}</span>;
  }
  return (
    <>
      <EuiLink
        // The URL resolves asynchronously, but a click opens the details either way, within Kibana.
        href={href || undefined}
        onClick={(event: MouseEvent) => {
          if (href && isModifiedClick(event)) {
            return;
          }
          event.preventDefault();
          if (DataStreamFlyout) {
            setIsFlyoutOpen(true);
          } else {
            locator.navigate(params);
          }
        }}
        className={className}
        data-test-subj="boostIndexManagementLink"
      >
        {children}
      </EuiLink>
      {DataStreamFlyout && isFlyoutOpen && (
        <DataStreamFlyout
          datastreamName={name}
          // The flyout can change or delete the data stream, after which it asks to reload.
          onClose={(shouldReload?: boolean) => {
            setIsFlyoutOpen(false);
            if (shouldReload) {
              refetchBoostState();
            }
          }}
        />
      )}
    </>
  );
};
