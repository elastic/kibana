/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CoreStart } from '@kbn/core/public';
import {
  EuiButtonIcon,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { isPhraseFilter, type Filter } from '@kbn/es-query';
import { DashboardCreationOptions, DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { compact, isEqual } from 'lodash';
import { DashboardState } from '@kbn/dashboard-plugin/public/dashboard_api/types';
import { EntityClient } from './entity_client';

interface FilterTriggerContext {
  filters: Filter[];
}

export function createEntityNavigationAction(coreStart: CoreStart, entityClient: EntityClient) {
  return {
    id: 'eem_navigation_action',
    getDisplayName: () => 'Go to entity view',
    getIconType: () => 'bullseye',
    isCompatible: async (context: FilterTriggerContext) => {
      try {
        const filterFields = compact(
          context.filters.filter(isPhraseFilter).map((filter) => filter.meta.key)
        );

        if (filterFields.length === 0) {
          return false;
        }

        const types = await entityClient.repositoryClient(
          'GET /internal/entities/v2/definitions/types'
        );

        if (types.types.length === 0) {
          return false;
        }

        const sources = await entityClient.repositoryClient(
          'GET /internal/entities/v2/definitions/sources'
        );

        if (sources.sources.length === 0) {
          return false;
        }

        const typesWithSources = types.types.map((type) => ({
          ...type,
          sources: sources.sources.filter((source) => source.type_id === type.id),
        }));

        return typesWithSources
          .filter((type) => type.dashboard_id)
          .some((typeWithSource) =>
            typeWithSource.sources.some((source) => isEqual(source.identity_fields, filterFields))
          );
      } catch (error) {
        coreStart.notifications.toasts.addError(error, { title: 'Unexpected error' });
        return false;
      }
    },
    execute: async (context: FilterTriggerContext) => {
      try {
        const filters = compact(
          context.filters.filter(isPhraseFilter).map((filter) => ({
            field: filter.meta.key,
            value: filter.meta.params?.query,
          }))
        );

        if (filters.length === 0) {
          return;
        }

        const types = await entityClient.repositoryClient(
          'GET /internal/entities/v2/definitions/types'
        );

        if (types.types.length === 0) {
          return;
        }

        const sources = await entityClient.repositoryClient(
          'GET /internal/entities/v2/definitions/sources'
        );

        if (sources.sources.length === 0) {
          return;
        }

        const typesWithSources = types.types.map((type) => ({
          ...type,
          sources: sources.sources.filter((source) => source.type_id === type.id),
        }));

        const matchingTypes = typesWithSources
          .filter((type) => type.dashboard_id)
          .filter((typeWithSource) =>
            typeWithSource.sources.some((source) =>
              isEqual(
                source.identity_fields,
                filters.map((filter) => filter.field)
              )
            )
          );

        if (matchingTypes.length === 0) {
          return;
        }

        coreStart.overlays.openFlyout(
          toMountPoint(
            <EntityNavigationModal matchingTypes={matchingTypes} filters={context.filters} />,
            coreStart
          )
        );
      } catch (error) {
        coreStart.notifications.toasts.addError(error, { title: 'Unexpected error' });
      }
    },
  };
}

interface Type {
  id: string;
  display_name: string;
  dashboard_id?: string;
}

interface EntityNavigationModalProps {
  matchingTypes: Type[];
  filters: Filter[];
}

function EntityNavigationModal({ matchingTypes, filters }: EntityNavigationModalProps) {
  const [selectedType, setSelectedType] = useState(
    matchingTypes.length === 1 ? matchingTypes[0] : undefined
  );

  async function getCreationOptions(): Promise<DashboardCreationOptions> {
    function getInitialInput(): Partial<DashboardState> {
      return { filters: filters.filter(isPhraseFilter) };
    }

    return {
      getInitialInput,
    };
  }

  if (selectedType) {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {matchingTypes.length > 1 ? (
              <EuiButtonIcon
                css={{ marginRight: '10px' }}
                onClick={() => {
                  setSelectedType(undefined);
                }}
                iconType="arrowLeft"
                aria-label="Back"
              />
            ) : null}
            {selectedType.display_name}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <DashboardRenderer
            savedObjectId={selectedType.dashboard_id}
            getCreationOptions={getCreationOptions}
          />
        </EuiModalBody>
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Matching entity types</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFlexGroup gutterSize="l">
            {matchingTypes.map((type) => (
              <EuiFlexItem key={type.id}>
                <EuiCard
                  icon={<EuiIcon size="xxl" type="sparkles" />}
                  title={type.display_name}
                  onClick={() => {
                    setSelectedType(type);
                  }}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiModalBody>
      </React.Fragment>
    );
  }
}
