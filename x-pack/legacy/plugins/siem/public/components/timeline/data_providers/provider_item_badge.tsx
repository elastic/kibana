/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { useCallback, useState } from 'react';

import { BrowserFields } from '../../../containers/source';

import { OnDataProviderEdited } from '../events';
import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';
import { QueryOperator } from './data_provider';
import { TimelineContext } from '../timeline_context';

interface ProviderItemBadgeProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  timelineId?: string;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  val: string | number;
}

export const ProviderItemBadge = React.memo<ProviderItemBadgeProps>(
  ({
    andProviderId,
    browserFields,
    deleteProvider,
    field,
    kqlQuery,
    isEnabled,
    isExcluded,
    onDataProviderEdited,
    operator,
    providerId,
    timelineId,
    toggleEnabledProvider,
    toggleExcludedProvider,
    val,
  }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const togglePopover = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const onToggleEnabledProvider = useCallback(() => {
      toggleEnabledProvider();
      closePopover();
    }, [toggleEnabledProvider]);

    const onToggleExcludedProvider = useCallback(() => {
      toggleExcludedProvider();
      closePopover();
    }, [toggleExcludedProvider]);

    return (
      <TimelineContext.Consumer>
        {isLoading => (
          <ProviderItemActions
            andProviderId={andProviderId}
            browserFields={browserFields}
            button={
              <ProviderBadge
                deleteProvider={!isLoading ? deleteProvider : noop}
                field={field}
                kqlQuery={kqlQuery}
                isEnabled={isEnabled}
                isExcluded={isExcluded}
                providerId={providerId}
                togglePopover={togglePopover}
                val={val}
                operator={operator}
              />
            }
            closePopover={closePopover}
            deleteProvider={deleteProvider}
            field={field}
            kqlQuery={kqlQuery}
            isEnabled={isEnabled}
            isExcluded={isExcluded}
            isLoading={isLoading}
            isOpen={isPopoverOpen}
            onDataProviderEdited={onDataProviderEdited}
            operator={operator}
            providerId={providerId}
            timelineId={timelineId}
            toggleEnabledProvider={onToggleEnabledProvider}
            toggleExcludedProvider={onToggleExcludedProvider}
            value={val}
          />
        )}
      </TimelineContext.Consumer>
    );
  }
);

ProviderItemBadge.displayName = 'ProviderItemBadge';
