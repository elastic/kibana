/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

interface Props {
  data: DataPublicPluginStart;
  dataViewId?: string;
  isInvalid: boolean;
  onChange: (dataview: DataView) => void;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export const DataViewSelect = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useMountedState();

  return (
    <props.unifiedSearch.ui.IndexPatternSelect
      isClearable={false}
      isDisabled={isLoading}
      isInvalid={props.isInvalid}
      isLoading={isLoading}
      indexPatternId={props.dataViewId ? props.dataViewId : ''}
      onChange={async (dataViewId?: string) => {
        if (!dataViewId) {
          return;
        }
        try {
          setIsLoading(true);
          const dataView = await props.data.indexPatterns.get(dataViewId);
          if (isMounted()) {
            props.onChange(dataView);
            setIsLoading(false);
          }
        } catch (error) {
          // ignore indexPatterns.get error,
          // if data view does not exist, select will not update rule params
          if (isMounted()) {
            setIsLoading(false);
          }
        }
      }}
      placeholder={i18n.translate('xpack.stackAlerts.geoContainment.dataViewSelectPlaceholder', {
        defaultMessage: 'Select data view',
      })}
    />
  );
};
